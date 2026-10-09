namespace EHS_FieldVisits_SQLServer.Models;

public sealed class VisitListItemDto
{
    public string Id { get; set; } = "";
    public string Facility { get; set; } = "";
    public string Emirate { get; set; } = "";
    public string Date { get; set; } = "";
    public string Team { get; set; } = "";
    public string Responsible { get; set; } = "";
    public string JobTitle { get; set; } = "";
    public string EmployeeName { get; set; } = "";
    public string EmployeeJobTitle { get; set; } = "";
    public string EmployeeEmail { get; set; } = "";
    public string EmployeePhone { get; set; } = "";
    public string ResponsibleEmail { get; set; } = "";
    public string ResponsiblePhone { get; set; } = "";
    public string Category { get; set; } = "";
    public string Priority { get; set; } = "";
    public string Status { get; set; } = "";
    public int Compliance { get; set; }
    public string Notes { get; set; } = "";
    public string Action { get; set; } = "";
    public string TakenAction { get; set; } = "";
    public string OwnerId { get; set; } = "";
    public string OwnerName { get; set; } = "";
    public string OwnerUsername { get; set; } = "";
    public List<string> Images { get; set; } = new();
    public string? ActionEvidence { get; set; }
}
