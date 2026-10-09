using EHS_FieldVisits_SQLServer.Data;
using EHS_FieldVisits_SQLServer.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
using System.Data;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;

namespace EHS_FieldVisits_SQLServer.Controllers;

[ApiController, Authorize]
[Route("api/visits")]
public class VisitsController(AppDbContext db, IWebHostEnvironment env) : ControllerBase
{
    [HttpGet("health")]
    public async Task<IActionResult> Health()
    {
        try
        {
            var canConnect = await db.Database.CanConnectAsync();
            var count = await db.Visits.CountAsync();
            return Ok(new { ok = canConnect, database = "EHS_FieldVisits", visits = count, machine = Environment.MachineName });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { ok = false, message = "تعذر الاتصال بقاعدة البيانات." });
        }
    }

    [HttpGet("diagnostics")]
    public async Task<IActionResult> Diagnostics()
    {
        try
        {
            var cs = db.Database.GetConnectionString() ?? "";
            var builder = new SqlConnectionStringBuilder(cs);
            await using var cn = new SqlConnection(cs);
            await cn.OpenAsync();
            await using var cmd = new SqlCommand("SELECT COUNT(1) FROM [Visits]", cn);
            var count = Convert.ToInt32(await cmd.ExecuteScalarAsync());
            return Ok(new { ok = true, build = "V47", server = builder.DataSource, database = builder.InitialCatalog, visits = count, machine = Environment.MachineName });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { ok = false, build = "V55", message = "تعذر الاتصال بقاعدة البيانات." });
        }
    }

    [HttpGet("count")]
    public async Task<IActionResult> Count()
    {
        try
        {
            var count = await db.Visits.AsNoTracking().CountAsync();
            Response.Headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0";
            return Ok(new { count });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "تعذر قراءة عدد الزيارات من قاعدة البيانات." });
        }
    }

    // Robust SQL reader: reads the Visits table directly so an old/mismatched
    // EF schema cannot make the dashboard appear empty.
    [HttpGet("raw")]
    public async Task<IActionResult> GetAllRaw()
    {
        try
        {
            var cs = db.Database.GetConnectionString();
            await using var cn = new SqlConnection(cs);
            await cn.OpenAsync();
            await using var cmd = new SqlCommand("SELECT * FROM [Visits] ORDER BY [Date] DESC, [Id] DESC", cn);
            await using var rd = await cmd.ExecuteReaderAsync();
            var result = new List<VisitListItemDto>();
            var names = Enumerable.Range(0, rd.FieldCount).ToDictionary(i => rd.GetName(i), i => i, StringComparer.OrdinalIgnoreCase);
            object V(string n) => names.TryGetValue(n, out var i) && !rd.IsDBNull(i) ? rd.GetValue(i) : "";
            string S(string n) => Convert.ToString(V(n)) ?? "";
            int I(string n) => int.TryParse(S(n), out var x) ? x : 0;
            while (await rd.ReadAsync())
            {
                var dateObj = V("Date");
                var date = dateObj is DateTime dt ? dt : DateTime.TryParse(Convert.ToString(dateObj), out var parsed) ? parsed : DateTime.MinValue;
                result.Add(new VisitListItemDto {
                    Id=S("Id"), Facility=S("Facility"), Emirate=S("Emirate"), Date=date == DateTime.MinValue ? "" : date.ToString("yyyy-MM-dd"),
                    Team=S("Team"), Responsible=S("Responsible"), JobTitle=S("JobTitle"), EmployeeName=S("EmployeeName"), EmployeeJobTitle=S("EmployeeJobTitle"),
                    EmployeeEmail=S("EmployeeEmail"), EmployeePhone=S("EmployeePhone"), ResponsibleEmail=S("ResponsibleEmail"), ResponsiblePhone=S("ResponsiblePhone"),
                    Category=S("Category"), Priority=S("Priority"), Status=S("Status"), Compliance=I("Compliance"), Notes=S("Notes"), Action=S("Action"),
                    TakenAction=S("TakenAction"), OwnerId=S("OwnerId"), OwnerName=S("OwnerName"), OwnerUsername=S("OwnerUsername"),
                    ActionEvidence=S("ActionEvidencePath"), Images=new List<string>()
                });
            }
            Response.Headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0";
            Response.Headers["X-EHS-Visits-Count"] = result.Count.ToString();
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message="تعذر قراءة الزيارات مباشرة من SQL Server." });
        }
    }

    [HttpGet("count-raw")]
    public async Task<IActionResult> CountRaw()
    {
        try
        {
            var cs = db.Database.GetConnectionString();
            await using var cn = new SqlConnection(cs);
            await cn.OpenAsync();
            await using var cmd = new SqlCommand("SELECT COUNT(1) FROM [Visits]", cn);
            var count = Convert.ToInt32(await cmd.ExecuteScalarAsync());
            Response.Headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0";
            return Ok(new { count });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message="تعذر قراءة عدد الزيارات مباشرة من SQL Server." });
        }
    }

    [HttpGet]
    public async Task<ActionResult<List<VisitListItemDto>>> GetAll()
    {
        try
        {
            // Materialize DateTime first; formatting DateTime with a custom format inside
            // an EF query is provider/version dependent and can make the GET endpoint fail.
            // Read the Visits table independently first. This keeps the dashboard
            // counters working even if an old VisitImages schema is different.
            var rows = await db.Visits
                .AsNoTracking()
                .OrderByDescending(x => x.Date)
                .ThenByDescending(x => x.Id)
                .ToListAsync();

            // Images are optional. Never let an old/mismatched VisitImages table
            // hide the Visits rows from the dashboard.
            var imagesByVisit = new Dictionary<int, List<string>>();
            try
            {
                var ids = rows.Select(x => x.Id).ToList();
                if (ids.Count > 0)
                {
                    var imageRows = await db.VisitImages.AsNoTracking()
                        .Where(i => ids.Contains(i.VisitId))
                        .ToListAsync();
                    imagesByVisit = imageRows.GroupBy(i => i.VisitId)
                        .ToDictionary(g => g.Key, g => g.Select(i => $"/uploads/visits/{i.FileName}").ToList());
                }
            }
            catch (Exception imageError)
            {
                // Keep visits visible even if only the optional image table is broken.
                Console.WriteLine($"EHS: VisitImages read skipped: {imageError.GetBaseException().Message}");
            }

            var visits = rows.Select(x => new VisitListItemDto
            {
                Id = x.Id.ToString(),
                Facility = x.Facility ?? "",
                Emirate = x.Emirate ?? "",
                Date = x.Date.ToString("yyyy-MM-dd"),
                Team = x.Team ?? "",
                Responsible = x.Responsible ?? "",
                JobTitle = x.JobTitle ?? "",
                EmployeeName = x.EmployeeName ?? "",
                EmployeeJobTitle = x.EmployeeJobTitle ?? "",
                EmployeeEmail = x.EmployeeEmail ?? "",
                EmployeePhone = x.EmployeePhone ?? "",
                ResponsibleEmail = x.ResponsibleEmail ?? "",
                ResponsiblePhone = x.ResponsiblePhone ?? "",
                Category = x.Category ?? "",
                Priority = x.Priority ?? "",
                Status = x.Status ?? "",
                Compliance = x.Compliance,
                Notes = x.Notes ?? "",
                Action = x.Action ?? "",
                TakenAction = x.TakenAction ?? "",
                OwnerId = x.OwnerId ?? "",
                OwnerName = x.OwnerName ?? "",
                OwnerUsername = x.OwnerUsername ?? "",
                Images = imagesByVisit.TryGetValue(x.Id, out var visitImages) ? visitImages : new List<string>(),
                ActionEvidence = x.ActionEvidencePath
            }).ToList();

            Response.Headers["X-EHS-Visits-Count"] = visits.Count.ToString();
            return Ok(visits);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "تعذر قراءة الزيارات من قاعدة البيانات."
            });
        }
    }

    [HttpPost]
    [RequestSizeLimit(25_000_000)]
    [RequestFormLimits(MultipartBodyLengthLimit = 25_000_000, MemoryBufferThreshold = 1_048_576)]
    public async Task<IActionResult> Save([FromForm] VisitForm f)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
            var username = User.Identity?.Name ?? "";
            var role = User.FindFirstValue(ClaimTypes.Role) ?? "user";
            if (!int.TryParse(userId, out var numericUserId)) return Unauthorized(new { message = "جلسة الدخول غير صالحة." });
            Visit v;
            if (f.Id.HasValue)
            {
                v = await db.Visits.Include(x => x.Images).FirstOrDefaultAsync(x => x.Id == f.Id.Value)
                    ?? throw new KeyNotFoundException("الزيارة غير موجودة.");
                if (!string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase) && v.OwnerId != userId)
                    return Forbid();
            }
            else
            {
                v = new Visit();
                v.OwnerId = userId;
                v.OwnerName = User.FindFirstValue(ClaimTypes.GivenName) ?? username;
                v.OwnerUsername = username;
            }

            v.Facility = f.Facility?.Trim() ?? "";
            v.Emirate = f.Emirate ?? "";
            v.Date = DateTime.TryParse(f.Date, out var d) ? d.Date : DateTime.Today;
            v.Team = f.Team ?? "";
            v.Responsible = f.Responsible ?? "";
            v.JobTitle = f.JobTitle ?? "";
            v.EmployeeName = f.EmployeeName ?? "";
            v.EmployeeJobTitle = f.EmployeeJobTitle ?? "";
            v.EmployeeEmail = f.EmployeeEmail ?? "";
            v.EmployeePhone = f.EmployeePhone ?? "";
            v.ResponsibleEmail = f.ResponsibleEmail ?? "";
            v.ResponsiblePhone = f.ResponsiblePhone ?? "";
            v.Category = f.Category ?? "";
            v.Priority = f.Priority ?? "";
            v.Status = f.Status ?? "";
            v.Compliance = Math.Clamp(f.Compliance, 0, 100);
            v.Notes = f.Notes ?? "";
            v.Action = f.Action ?? "";
            v.TakenAction = f.TakenAction ?? "";
            // Ownership is always derived from the authenticated server-side identity.
            if (v.Id == 0)
            {
                v.OwnerId = userId;
                v.OwnerName = User.FindFirstValue(ClaimTypes.GivenName) ?? username;
                v.OwnerUsername = username;
            }

            if (v.Id == 0)
            {
                db.Visits.Add(v);
                await db.SaveChangesAsync();
            }

            var dir = Path.Combine(env.WebRootPath, "uploads", "visits");
            Directory.CreateDirectory(dir);

            foreach (var file in f.Images ?? [])
            {
                if (file.Length == 0) continue;
                if (file.Length > 10_000_000) return BadRequest(new { message = "حجم صورة الزيارة يجب ألا يتجاوز 10 MB." });
                var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
                var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp" };
                if (!allowed.Contains(ext)) return BadRequest(new { message = "يسمح فقط بصور JPG وPNG وWEBP." });
                var safe = Guid.NewGuid() + ext;
                byte[] bytes;
                await using (var ms = new MemoryStream())
                {
                    await file.CopyToAsync(ms);
                    bytes = ms.ToArray();
                }
                // V61: save the actual bytes in SQL Server. Also keep a filesystem copy
                // as a fallback for compatibility with older records.
                await System.IO.File.WriteAllBytesAsync(Path.Combine(dir, safe), bytes);
                db.VisitImages.Add(new VisitImage
                {
                    VisitId = v.Id,
                    FileName = safe,
                    FilePath = $"/uploads/visits/{safe}",
                    ContentType = string.IsNullOrWhiteSpace(file.ContentType) ? "image/jpeg" : file.ContentType,
                    Data = bytes
                });
            }

            if (f.ActionEvidence is { Length: > 0 })
            {
                if (f.ActionEvidence.Length > 10_000_000) return BadRequest(new { message = "حجم دليل الإجراء يجب ألا يتجاوز 10 MB." });
                var evidenceExt = Path.GetExtension(f.ActionEvidence.FileName).ToLowerInvariant();
                var evidenceAllowed = new[] { ".jpg", ".jpeg", ".png", ".webp" };
                if (!evidenceAllowed.Contains(evidenceExt)) return BadRequest(new { message = "يسمح فقط بصور JPG وPNG وWEBP لدليل الإجراء." });
                var safe = Guid.NewGuid() + evidenceExt;
                await using var s = System.IO.File.Create(Path.Combine(dir, safe));
                await f.ActionEvidence.CopyToAsync(s);
                v.ActionEvidencePath = $"/uploads/visits/{safe}";
            }

            await db.SaveChangesAsync();
            var savedImageCount = await db.VisitImages.CountAsync(x => x.VisitId == v.Id);
            return Ok(new { id = v.Id.ToString(), imageCount = savedImageCount });
        }
        catch (DbUpdateException ex)
        {
            return StatusCode(500, new { message = "تعذر حفظ الزيارة في قاعدة البيانات." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "حدث خطأ أثناء حفظ الزيارة." });
        }
    }

    [HttpGet("{id:int}/images")]
    public async Task<IActionResult> GetImages(int id)
    {
        var v = await db.Visits.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (v == null) return NotFound();
        // Viewing visit images follows the same read-access rule as the visits list:
        // every authenticated user may view images belonging to any visit.
        // Ownership restrictions remain on editing/deleting visits and uploading.

        var rows = await db.VisitImages.AsNoTracking()
            .Where(x => x.VisitId == id)
            .OrderBy(x => x.Id)
            .Select(x => new { fileName = x.FileName, filePath = x.FilePath, contentType = x.ContentType, hasData = x.Data != null && x.Data.Length > 0 })
            .ToListAsync();

        return Ok(rows);
    }

    [HttpGet("{id:int}/image/{fileName}")]
    public async Task<IActionResult> GetImage(int id, string fileName)
    {
        // Serve visit images through an authenticated endpoint instead of relying on
        // wwwroot static-file behavior. This is reliable through Dev Tunnels/Azure
        // and keeps uploaded evidence behind the same authorization boundary.
        if (string.IsNullOrWhiteSpace(fileName) || fileName != Path.GetFileName(fileName))
            return BadRequest();

        var v = await db.Visits.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        if (v == null) return NotFound();
        // Images are readable by every authenticated user, including images
        // uploaded by another user. Edit/delete permissions are unchanged.

        var image = await db.VisitImages.AsNoTracking()
            .FirstOrDefaultAsync(x => x.VisitId == id && x.FileName == fileName);
        if (image == null) return NotFound();

        var contentType = string.IsNullOrWhiteSpace(image.ContentType) ? "application/octet-stream" : image.ContentType;
        // V61: prefer bytes stored in SQL Server; fall back to the legacy file copy.
        if (image.Data is { Length: > 0 })
            return File(image.Data, contentType);
        var path = Path.Combine(env.WebRootPath, "uploads", "visits", fileName);
        if (!System.IO.File.Exists(path)) return NotFound();
        return PhysicalFile(path, contentType, enableRangeProcessing: true);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            var v = await db.Visits.FindAsync(id);
            if (v == null) return NotFound(new { message = "الزيارة غير موجودة." });
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "";
            var role = User.FindFirstValue(ClaimTypes.Role) ?? "user";
            if (!string.Equals(role, "admin", StringComparison.OrdinalIgnoreCase) && v.OwnerId != userId) return Forbid();
            db.Visits.Remove(v);
            await db.SaveChangesAsync();
            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "تعذر حذف الزيارة." });
        }
    }

    public class VisitForm
    {
        public int? Id { get; set; }
        public string? Facility { get; set; }
        public string? Emirate { get; set; }
        public string? Date { get; set; }
        public string? Team { get; set; }
        public string? Responsible { get; set; }
        public string? JobTitle { get; set; }
        public string? EmployeeName { get; set; }
        public string? EmployeeJobTitle { get; set; }
        public string? EmployeeEmail { get; set; }
        public string? EmployeePhone { get; set; }
        public string? ResponsibleEmail { get; set; }
        public string? ResponsiblePhone { get; set; }
        public string? Category { get; set; }
        public string? Priority { get; set; }
        public string? Status { get; set; }
        public int Compliance { get; set; }
        public string? Notes { get; set; }
        public string? Action { get; set; }
        public string? TakenAction { get; set; }
        public string? OwnerId { get; set; }
        public string? OwnerName { get; set; }
        public string? OwnerUsername { get; set; }
        public List<IFormFile>? Images { get; set; }
        public IFormFile? ActionEvidence { get; set; }
    }
}
