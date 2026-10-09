namespace EHS_FieldVisits_SQLServer.Models;
public class VisitImage
{
    public int Id { get; set; }
    public int VisitId { get; set; }
    public string FileName { get; set; } = "";
    public string FilePath { get; set; } = "";
    public string ContentType { get; set; } = "application/octet-stream";
    // V61: keep the uploaded image bytes in SQL Server as the authoritative copy.
    // This avoids relying on wwwroot persistence (especially through Dev Tunnels/Azure).
    public byte[]? Data { get; set; }
    public Visit? Visit { get; set; }
}
