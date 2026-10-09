namespace EHS_FieldVisits_SQLServer.Models;

public sealed class ReportListItemDto
{
    public string Id { get; set; } = "";
    public string Title { get; set; } = "";
    public string Date { get; set; } = "";
    public string DateFrom { get; set; } = "";
    public string DateTo { get; set; } = "";
    public string Facility { get; set; } = "";
    public string Type { get; set; } = "";
    public string Description { get; set; } = "";
    public string OwnerId { get; set; } = "";
    public string OwnerUsername { get; set; } = "";
    public ReportFileDto? File { get; set; }
}

public sealed class ReportFileDto
{
    public string Name { get; set; } = "";
    public string Url { get; set; } = "";
    public string ContentType { get; set; } = "application/octet-stream";
}

public sealed class ApiErrorDto
{
    public string Message { get; set; } = "";
    public string? Detail { get; set; }
}

public sealed class ReportSaveResultDto
{
    public int Id { get; set; }
    public string Type { get; set; } = "";
    public string Message { get; set; } = "";
}
