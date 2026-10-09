using System.Security.Claims;
using EHS_FieldVisits_SQLServer.Data;
using EHS_FieldVisits_SQLServer.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace EHS_FieldVisits_SQLServer.Controllers;

[ApiController, Route("api/auth")]
public class AuthController(AppDbContext db, IPasswordHasher<AppUser> hasher) : ControllerBase
{
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        if (!(User.Identity?.IsAuthenticated ?? false)) return Unauthorized(new { message = "غير مسجل الدخول." });
        var id = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(id, out var userId)) return Unauthorized(new { message = "جلسة الدخول غير صالحة." });
        var u = await db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == userId);
        if (u == null) return Unauthorized(new { message = "المستخدم غير موجود." });
        return Ok(ToDto(u));
    }

    [HttpPost("login"), EnableRateLimiting("auth")]
    public async Task<IActionResult> Login(LoginRequest r)
    {
        var username = r.Username?.Trim() ?? "";
        if (username.Length is < 3 or > 256 || string.IsNullOrWhiteSpace(r.Password))
            return BadRequest(new { message = "بيانات الدخول غير صحيحة." });

        var u = await db.Users.FirstOrDefaultAsync(x => x.Username.ToLower() == username.ToLower());
        if (u == null || hasher.VerifyHashedPassword(u, u.PasswordHash, r.Password) == PasswordVerificationResult.Failed)
            return Unauthorized(new { message = "اسم المستخدم أو كلمة المرور غير صحيحة." });

        await SignIn(u);
        return Ok(ToDto(u));
    }

    [HttpPost("register"), EnableRateLimiting("auth")]
    public async Task<IActionResult> Register(RegisterRequest r)
    {
        var name = r.Name?.Trim() ?? "";
        var username = r.Username?.Trim() ?? "";
        if (name.Length is < 2 or > 150 || username.Length is < 3 or > 256 || string.IsNullOrWhiteSpace(r.Password) || r.Password.Length < 12)
            return BadRequest(new { message = "الاسم واسم المستخدم مطلوبان، وكلمة المرور يجب ألا تقل عن 12 حرفًا." });
        if (await db.Users.AnyAsync(x => x.Username.ToLower() == username.ToLower()))
            return Conflict(new { message = "اسم المستخدم مستخدم بالفعل." });

        var u = new AppUser { Name = name, Username = username, Role = "user" };
        u.PasswordHash = hasher.HashPassword(u, r.Password);
        db.Users.Add(u);
        await db.SaveChangesAsync();
        await SignIn(u);
        return Ok(ToDto(u));
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    private async Task SignIn(AppUser u)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, u.Id.ToString()),
            new(ClaimTypes.Name, u.Username),
            new(ClaimTypes.GivenName, u.Name),
            new(ClaimTypes.Role, u.Role.ToLowerInvariant())
        };
        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identity),
            new AuthenticationProperties { IsPersistent = false, AllowRefresh = true });
    }

    private static object ToDto(AppUser u) => new { id = u.Id.ToString(), name = u.Name, username = u.Username, role = u.Role };
    public record LoginRequest(string Username, string Password);
    public record RegisterRequest(string Name, string Username, string Password);
}
