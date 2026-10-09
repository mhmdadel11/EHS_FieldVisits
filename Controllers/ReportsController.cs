using EHS_FieldVisits_SQLServer.Data;
using EHS_FieldVisits_SQLServer.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace EHS_FieldVisits_SQLServer.Controllers;

[ApiController, Authorize]
[Route("api/reports")]
public class ReportsController(AppDbContext db) : ControllerBase
{
    // Dedicated endpoints. Visit and monthly reports are always separated by Type.
    [HttpGet("visit")]
    public Task<ActionResult<List<ReportListItemDto>>> GetVisitReports() => GetByType("تقرير زيارة");

    [HttpGet("monthly")]
    public Task<ActionResult<List<ReportListItemDto>>> GetMonthlyReports() => GetByType("تقرير شهري");

    // Compatibility endpoint for older cached pages. It returns the same typed DTOs,
    // never anonymous nested objects, so the System.Text.Json "id collision" cannot occur.
    [HttpGet("")]
    public Task<ActionResult<List<ReportListItemDto>>> GetAllReports() => GetByType(null);

    private async Task<ActionResult<List<ReportListItemDto>>> GetByType(string? type)
    {
        try
        {
            var query = db.Reports.AsNoTracking();
            if (!string.IsNullOrEmpty(type))
                query = query.Where(x => x.Type == type);

            var reports = await query
                .OrderByDescending(x => x.CreatedAt)
                .Select(x => new ReportListItemDto
                {
                    Id = x.Id.ToString(),
                    Title = x.Title,
                    Date = x.Date.ToString("yyyy-MM-dd"),
                    DateFrom = x.DateFrom.ToString("yyyy-MM-dd"),
                    DateTo = x.DateTo.ToString("yyyy-MM-dd"),
                    Facility = x.Facility,
                    Type = x.Type,
                    Description = x.Description,
                    OwnerId = x.OwnerId,
                    OwnerUsername = x.OwnerUsername,
                    File = x.FileName == null ? null : new ReportFileDto
                    {
                        Name = x.FileName,
                        Url = $"/api/reports/{x.Id}/file",
                        ContentType = x.FileContentType ?? "application/octet-stream"
                    }
                })
                .ToListAsync();

            return Ok(reports);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ApiErrorDto
            {
                Message = "تعذر قراءة التقارير من SQL Server.",
                Detail = null
            });
        }
    }

    [HttpGet("{id:int}/file")]
    public async Task<IActionResult> File(int id)
    {
        try
        {
            var report = await db.Reports.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
            if (report == null) return NotFound(new ApiErrorDto { Message = "التقرير غير موجود." });
            if (report.FileData == null || report.FileData.Length == 0)
                return NotFound(new ApiErrorDto { Message = "لا يوجد ملف محفوظ لهذا التقرير." });

            return File(report.FileData,
                report.FileContentType ?? "application/octet-stream",
                report.FileName ?? "report");
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ApiErrorDto
            {
                Message = "تعذر فتح ملف التقرير.",
                Detail = null
            });
        }
    }

    [HttpPost("visit")]
    [RequestSizeLimit(25_000_000)]
    [RequestFormLimits(MultipartBodyLengthLimit = 25_000_000, MemoryBufferThreshold = 1_048_576)]
    public Task<IActionResult> SaveVisit([FromForm] ReportForm f) => SaveInternal(f, "تقرير زيارة");

    [HttpPost("monthly")]
    [RequestSizeLimit(25_000_000)]
    [RequestFormLimits(MultipartBodyLengthLimit = 25_000_000, MemoryBufferThreshold = 1_048_576)]
    public Task<IActionResult> SaveMonthly([FromForm] ReportForm f) => SaveInternal(f, "تقرير شهري");

    // Compatibility endpoint for any old cached JavaScript that still posts to /api/reports.
    [HttpPost("")]
    [RequestSizeLimit(25_000_000)]
    [RequestFormLimits(MultipartBodyLengthLimit = 25_000_000, MemoryBufferThreshold = 1_048_576)]
    public Task<IActionResult> SaveLegacy([FromForm] LegacyReportForm f)
    {
        var type = string.Equals(f.Type, "تقرير شهري", StringComparison.OrdinalIgnoreCase)
            || string.Equals(f.Type, "monthly", StringComparison.OrdinalIgnoreCase)
            ? "تقرير شهري"
            : "تقرير زيارة";

        return SaveInternal(new ReportForm
        {
            Title = f.Title,
            DateFrom = f.DateFrom,
            DateTo = f.DateTo,
            Facility = f.Facility,
            Description = f.Description,
            File = f.File
        }, type);
    }

    private async Task<IActionResult> SaveInternal(ReportForm f, string type)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(f.Title))
                return BadRequest(new ApiErrorDto { Message = "عنوان التقرير مطلوب." });

            if (!DateTime.TryParse(f.DateFrom, out var dateFrom))
                return BadRequest(new ApiErrorDto { Message = "تاريخ التقرير غير صحيح." });

            var dateTo = dateFrom;
            if (!DateTime.TryParse(f.DateTo, out dateTo))
                return BadRequest(new ApiErrorDto { Message = "تاريخ النهاية غير صحيح." });
            if (dateFrom.Date > dateTo.Date)
                return BadRequest(new ApiErrorDto { Message = "تاريخ البداية يجب أن يكون قبل أو مساويًا لتاريخ النهاية." });

            var r = new Report
            {
                Title = f.Title.Trim(),
                Date = dateTo.Date,
                DateFrom = dateFrom.Date,
                DateTo = dateTo.Date,
                Facility = type == "تقرير زيارة" ? (f.Facility?.Trim() ?? "") : "",
                Type = type,
                Description = f.Description?.Trim() ?? "",
                CreatedAt = DateTime.UtcNow,
                OwnerId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "",
                OwnerUsername = User.Identity?.Name ?? ""
            };

            if (f.File is { Length: > 0 })
            {
                if (f.File.Length > 20_000_000)
                    return BadRequest(new ApiErrorDto { Message = "حجم ملف التقرير يجب ألا يتجاوز 20 MB." });
                var ext = Path.GetExtension(f.File.FileName).ToLowerInvariant();
                if (ext != ".pptx")
                    return BadRequest(new ApiErrorDto { Message = "ملف التقرير يجب أن يكون PowerPoint بصيغة PPTX." });

                r.FileName = Path.GetFileName(f.File.FileName);
                r.FileContentType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

                await using var ms = new MemoryStream();
                await f.File.CopyToAsync(ms);
                r.FileData = ms.ToArray();
            }

            db.Reports.Add(r);
            await db.SaveChangesAsync();

            return Ok(new ReportSaveResultDto
            {
                Id = r.Id,
                Type = type,
                Message = $"تم حفظ {type} بنجاح داخل SQL Server."
            });
        }
        catch (DbUpdateException ex)
        {
            return StatusCode(500, new ApiErrorDto
            {
                Message = "تعذر حفظ التقرير داخل SQL Server.",
                Detail = null
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ApiErrorDto
            {
                Message = "حدث خطأ أثناء حفظ التقرير.",
                Detail = null
            });
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            var r = await db.Reports.FindAsync(id);
            if (r == null) return NotFound(new ApiErrorDto { Message = "التقرير غير موجود." });
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
            var role = User.FindFirstValue(ClaimTypes.Role) ?? "user";
            if (!string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase) && r.OwnerId != userId) return Forbid();
            db.Reports.Remove(r);
            await db.SaveChangesAsync();
            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new ApiErrorDto
            {
                Message = "تعذر حذف التقرير.",
                Detail = null
            });
        }
    }

    public class ReportForm
    {
        public string? Title { get; set; }
        public string? DateFrom { get; set; }
        public string? DateTo { get; set; }
        public string? Facility { get; set; }
        public string? Description { get; set; }
        public IFormFile? File { get; set; }
    }

    public class LegacyReportForm : ReportForm
    {
        public string? Type { get; set; }
    }
}
