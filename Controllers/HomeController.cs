using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EHS_FieldVisits_SQLServer.Controllers;

public class HomeController : Controller
{
    [AllowAnonymous]
    public IActionResult Index() => View("index");
    [AllowAnonymous]
    public IActionResult Login() => View("login");
    [AllowAnonymous]
    public IActionResult Register() => View("register");
    [Authorize]
    public IActionResult NewVisit() => View("new-visit");
    [Authorize]
    public IActionResult VisitDetails() => View("visit-details");
    [Authorize]
    public IActionResult Reports() => View("reports");
    [Authorize]
    public IActionResult ReportsSqlFinal() => View("reports-sql-final");
    [Authorize]
    public IActionResult Responsibles() => View("responsibles");
    [Authorize]
    public IActionResult ResponsibleDetails() => View("responsible-details");
    [Authorize]
    public IActionResult Employees() => View("employees");
}
