namespace EHS_FieldVisits_SQLServer.Models;
public class Report
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public DateTime Date { get; set; }
    public DateTime DateFrom { get; set; }
    public DateTime DateTo { get; set; }
    public string Facility { get; set; } = "";
    public string Type { get; set; } = "";
    public string Description { get; set; } = "";
    public string? FileName { get; set; }
    public string? FileContentType { get; set; }
    public byte[]? FileData { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string OwnerId { get; set; } = "";
    public string OwnerUsername { get; set; } = "";
}
