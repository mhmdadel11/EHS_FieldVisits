using System.Security.Claims;
using System.Threading.RateLimiting;
using EHS_FieldVisits_SQLServer.Data;
using EHS_FieldVisits_SQLServer.Models;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllersWithViews();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.Configure<FormOptions>(o => {
    o.MultipartBodyLengthLimit = 25_000_000;
    o.MemoryBufferThreshold = 1_048_576;
});
builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = 25_000_000);

builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddScoped<IPasswordHasher<AppUser>, PasswordHasher<AppUser>>();

builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "EHS.Auth";
        options.Cookie.HttpOnly = true;
        options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
        options.Cookie.SameSite = SameSiteMode.Strict;
        options.Cookie.IsEssential = true;
        options.ExpireTimeSpan = TimeSpan.FromHours(8);
        options.SlidingExpiration = true;
        options.LoginPath = "/login.html";
        options.AccessDeniedPath = "/login.html";
        options.Events.OnRedirectToLogin = context =>
        {
            if (context.Request.Path.StartsWithSegments("/api"))
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return Task.CompletedTask;
            }
            context.Response.Redirect("/login.html");
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = context =>
        {
            if (context.Request.Path.StartsWithSegments("/api"))
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                return Task.CompletedTask;
            }
            context.Response.Redirect("/login.html");
            return Task.CompletedTask;
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("auth", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 8,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
            AutoReplenishment = true
        }));
});

var app = builder.Build();

// Development-only API documentation. Never expose Swagger in Production.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();

    db.Database.ExecuteSqlRaw(@"
IF OBJECT_ID(N'[Visits]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('Visits','Facility') IS NULL ALTER TABLE [Visits] ADD [Facility] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_Facility] DEFAULT N'';
    IF COL_LENGTH('Visits','Emirate') IS NULL ALTER TABLE [Visits] ADD [Emirate] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_Emirate] DEFAULT N'';
    IF COL_LENGTH('Visits','Date') IS NULL ALTER TABLE [Visits] ADD [Date] DATETIME2 NOT NULL CONSTRAINT [DF_Visits_Date] DEFAULT GETDATE();
    IF COL_LENGTH('Visits','Team') IS NULL ALTER TABLE [Visits] ADD [Team] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_Team] DEFAULT N'';
    IF COL_LENGTH('Visits','Responsible') IS NULL ALTER TABLE [Visits] ADD [Responsible] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_Responsible] DEFAULT N'';
    IF COL_LENGTH('Visits','JobTitle') IS NULL ALTER TABLE [Visits] ADD [JobTitle] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_JobTitle] DEFAULT N'';
    IF COL_LENGTH('Visits','EmployeeName') IS NULL ALTER TABLE [Visits] ADD [EmployeeName] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_EmployeeName] DEFAULT N'';
    IF COL_LENGTH('Visits','EmployeeJobTitle') IS NULL ALTER TABLE [Visits] ADD [EmployeeJobTitle] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_EmployeeJobTitle] DEFAULT N'';
    IF COL_LENGTH('Visits','EmployeeEmail') IS NULL ALTER TABLE [Visits] ADD [EmployeeEmail] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_EmployeeEmail] DEFAULT N'';
    IF COL_LENGTH('Visits','EmployeePhone') IS NULL ALTER TABLE [Visits] ADD [EmployeePhone] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_EmployeePhone] DEFAULT N'';
    IF COL_LENGTH('Visits','ResponsibleEmail') IS NULL ALTER TABLE [Visits] ADD [ResponsibleEmail] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_ResponsibleEmail] DEFAULT N'';
    IF COL_LENGTH('Visits','ResponsiblePhone') IS NULL ALTER TABLE [Visits] ADD [ResponsiblePhone] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_ResponsiblePhone] DEFAULT N'';
    IF COL_LENGTH('Visits','Category') IS NULL ALTER TABLE [Visits] ADD [Category] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_Category] DEFAULT N'';
    IF COL_LENGTH('Visits','Priority') IS NULL ALTER TABLE [Visits] ADD [Priority] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_Priority] DEFAULT N'';
    IF COL_LENGTH('Visits','Status') IS NULL ALTER TABLE [Visits] ADD [Status] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_Status] DEFAULT N'';
    IF COL_LENGTH('Visits','Compliance') IS NULL ALTER TABLE [Visits] ADD [Compliance] INT NOT NULL CONSTRAINT [DF_Visits_Compliance] DEFAULT 0;
    IF COL_LENGTH('Visits','Notes') IS NULL ALTER TABLE [Visits] ADD [Notes] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_Notes] DEFAULT N'';
    IF COL_LENGTH('Visits','Action') IS NULL ALTER TABLE [Visits] ADD [Action] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_Action] DEFAULT N'';
    IF COL_LENGTH('Visits','TakenAction') IS NULL ALTER TABLE [Visits] ADD [TakenAction] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_TakenAction] DEFAULT N'';
    IF COL_LENGTH('Visits','ActionEvidencePath') IS NULL ALTER TABLE [Visits] ADD [ActionEvidencePath] NVARCHAR(MAX) NULL;
    IF COL_LENGTH('Visits','OwnerId') IS NULL ALTER TABLE [Visits] ADD [OwnerId] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_OwnerId] DEFAULT N'';
    IF COL_LENGTH('Visits','OwnerName') IS NULL ALTER TABLE [Visits] ADD [OwnerName] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_OwnerName] DEFAULT N'';
    IF COL_LENGTH('Visits','OwnerUsername') IS NULL ALTER TABLE [Visits] ADD [OwnerUsername] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_Visits_OwnerUsername] DEFAULT N'';
    IF COL_LENGTH('Visits','CreatedAt') IS NULL ALTER TABLE [Visits] ADD [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_Visits_CreatedAt] DEFAULT SYSUTCDATETIME();
END
IF OBJECT_ID(N'[VisitImages]', N'U') IS NULL
BEGIN
    CREATE TABLE [VisitImages](
        [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_VisitImages] PRIMARY KEY,
        [VisitId] INT NOT NULL,
        [FileName] NVARCHAR(MAX) NOT NULL,
        [FilePath] NVARCHAR(MAX) NOT NULL,
        [ContentType] NVARCHAR(255) NOT NULL CONSTRAINT [DF_VisitImages_ContentType] DEFAULT N'application/octet-stream',
        [Data] VARBINARY(MAX) NULL
    );
END
ELSE
BEGIN
    IF COL_LENGTH('VisitImages','VisitId') IS NULL ALTER TABLE [VisitImages] ADD [VisitId] INT NOT NULL CONSTRAINT [DF_VisitImages_VisitId] DEFAULT 0;
    IF COL_LENGTH('VisitImages','FileName') IS NULL ALTER TABLE [VisitImages] ADD [FileName] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_VisitImages_FileName] DEFAULT N'';
    IF COL_LENGTH('VisitImages','FilePath') IS NULL ALTER TABLE [VisitImages] ADD [FilePath] NVARCHAR(MAX) NOT NULL CONSTRAINT [DF_VisitImages_FilePath] DEFAULT N'';
    IF COL_LENGTH('VisitImages','ContentType') IS NULL ALTER TABLE [VisitImages] ADD [ContentType] NVARCHAR(255) NOT NULL CONSTRAINT [DF_VisitImages_ContentType] DEFAULT N'application/octet-stream';
    IF COL_LENGTH('VisitImages','Data') IS NULL ALTER TABLE [VisitImages] ADD [Data] VARBINARY(MAX) NULL;
END
IF OBJECT_ID(N'[Reports]', N'U') IS NULL
BEGIN
    CREATE TABLE [Reports](
        [Id] INT IDENTITY(1,1) NOT NULL CONSTRAINT [PK_Reports] PRIMARY KEY,
        [Title] NVARCHAR(MAX) NOT NULL,
        [Date] DATETIME2 NOT NULL,
        [DateFrom] DATETIME2 NOT NULL,
        [DateTo] DATETIME2 NOT NULL,
        [Facility] NVARCHAR(MAX) NOT NULL,
        [Type] NVARCHAR(MAX) NOT NULL,
        [Description] NVARCHAR(MAX) NOT NULL,
        [FileName] NVARCHAR(MAX) NULL,
        [FileContentType] NVARCHAR(255) NULL,
        [FileData] VARBINARY(MAX) NULL,
        [CreatedAt] DATETIME2 NOT NULL,
        [OwnerId] NVARCHAR(64) NOT NULL CONSTRAINT [DF_Reports_OwnerId] DEFAULT N'',
        [OwnerUsername] NVARCHAR(256) NOT NULL CONSTRAINT [DF_Reports_OwnerUsername] DEFAULT N''
    );
END
ELSE
BEGIN
    IF COL_LENGTH('Reports','DateFrom') IS NULL ALTER TABLE [Reports] ADD [DateFrom] DATETIME2 NULL;
    IF COL_LENGTH('Reports','DateTo') IS NULL ALTER TABLE [Reports] ADD [DateTo] DATETIME2 NULL;
    IF COL_LENGTH('Reports','Facility') IS NULL ALTER TABLE [Reports] ADD [Facility] NVARCHAR(MAX) NULL;
    IF COL_LENGTH('Reports','Type') IS NULL ALTER TABLE [Reports] ADD [Type] NVARCHAR(MAX) NULL;
    IF COL_LENGTH('Reports','Description') IS NULL ALTER TABLE [Reports] ADD [Description] NVARCHAR(MAX) NULL;
    IF COL_LENGTH('Reports','FileName') IS NULL ALTER TABLE [Reports] ADD [FileName] NVARCHAR(MAX) NULL;
    IF COL_LENGTH('Reports','FileContentType') IS NULL ALTER TABLE [Reports] ADD [FileContentType] NVARCHAR(255) NULL;
    IF COL_LENGTH('Reports','FileData') IS NULL ALTER TABLE [Reports] ADD [FileData] VARBINARY(MAX) NULL;
    IF COL_LENGTH('Reports','CreatedAt') IS NULL ALTER TABLE [Reports] ADD [CreatedAt] DATETIME2 NULL;
    IF COL_LENGTH('Reports','OwnerId') IS NULL ALTER TABLE [Reports] ADD [OwnerId] NVARCHAR(64) NOT NULL CONSTRAINT [DF_Reports_OwnerId] DEFAULT N'';
    IF COL_LENGTH('Reports','OwnerUsername') IS NULL ALTER TABLE [Reports] ADD [OwnerUsername] NVARCHAR(256) NOT NULL CONSTRAINT [DF_Reports_OwnerUsername] DEFAULT N'';
    UPDATE [Reports] SET [DateFrom] = ISNULL([DateFrom],[Date]), [DateTo] = ISNULL([DateTo],[Date]), [Facility] = ISNULL([Facility],N''), [Type] = ISNULL([Type],N'تقرير زيارة'), [Description] = ISNULL([Description],N''), [CreatedAt] = ISNULL([CreatedAt],SYSUTCDATETIME()) WHERE [DateFrom] IS NULL OR [DateTo] IS NULL OR [Facility] IS NULL OR [Type] IS NULL OR [Description] IS NULL OR [CreatedAt] IS NULL;
END");

    // Optional, explicit bootstrap only. There is NO default admin password in source code.
    var adminUser = builder.Configuration["AdminBootstrap:Username"];
    var adminPassword = builder.Configuration["AdminBootstrap:Password"];
    if (!string.IsNullOrWhiteSpace(adminUser) && !string.IsNullOrWhiteSpace(adminPassword) && adminPassword.Length >= 12)
    {
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<AppUser>>();
        var existing = await db.Users.FirstOrDefaultAsync(x => x.Username.ToLower() == adminUser.Trim().ToLower());
        if (existing == null)
        {
            existing = new AppUser { Name = "مدير النظام", Username = adminUser.Trim(), Role = "admin" };
            existing.PasswordHash = hasher.HashPassword(existing, adminPassword);
            db.Users.Add(existing);
            await db.SaveChangesAsync();
        }
        else if (!string.Equals(existing.Role, "admin", StringComparison.OrdinalIgnoreCase))
        {
            existing.Role = "admin";
            await db.SaveChangesAsync();
        }
    }
}

if (!app.Environment.IsDevelopment()) app.UseHsts();
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

// Prevent cross-site browser requests to state-changing API endpoints.
app.Use(async (context, next) =>
{
    if (HttpMethods.IsPost(context.Request.Method) || HttpMethods.IsPut(context.Request.Method) || HttpMethods.IsPatch(context.Request.Method) || HttpMethods.IsDelete(context.Request.Method))
    {
        var path = context.Request.Path.Value ?? "";
        if (path.StartsWith("/api/", StringComparison.OrdinalIgnoreCase) &&
            !path.StartsWith("/api/auth/login", StringComparison.OrdinalIgnoreCase) &&
            !path.StartsWith("/api/auth/register", StringComparison.OrdinalIgnoreCase))
        {
            var origin = context.Request.Headers.Origin.ToString();
            if (!string.IsNullOrWhiteSpace(origin) && Uri.TryCreate(origin, UriKind.Absolute, out var originUri))
            {
                var expectedHost = context.Request.Host.Host;
                var expectedScheme = context.Request.Scheme;
                if (!string.Equals(originUri.Host, expectedHost, StringComparison.OrdinalIgnoreCase) ||
                    !string.Equals(originUri.Scheme, expectedScheme, StringComparison.OrdinalIgnoreCase) ||
                    (originUri.IsDefaultPort ? expectedScheme == "https" ? 443 : 80 : originUri.Port) != context.Request.Host.Port.GetValueOrDefault(expectedScheme == "https" ? 443 : 80))
                {
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    await context.Response.WriteAsJsonAsync(new { message = "تم رفض الطلب لأسباب أمنية." });
                    return;
                }
            }
        }
    }
    await next();
});

app.Use(async (context, next) =>
{
    context.Response.Headers["X-EHS-Build"] = "V61-IMAGES-SQL-BLOB-FIX";
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    context.Response.Headers["Permissions-Policy"] = "camera=(self), microphone=(), geolocation=()";
    await next();
});

// Static HTML pages are protected by the server. JS/localStorage cannot bypass this.
app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value ?? "/";
    var isPage = path == "/" || path.EndsWith(".html", StringComparison.OrdinalIgnoreCase);
    var isPublicPage = path.Equals("/login.html", StringComparison.OrdinalIgnoreCase) || path.Equals("/register.html", StringComparison.OrdinalIgnoreCase);
    if (isPage && !isPublicPage && !(context.User.Identity?.IsAuthenticated ?? false))
    {
        context.Response.Redirect("/login.html");
        return;
    }
    await next();
});

// Uploaded evidence/images require an authenticated user; they are not public files.
app.Use(async (context, next) =>
{
    if ((context.Request.Path.Value ?? "").StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase) &&
        !(context.User.Identity?.IsAuthenticated ?? false))
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return;
    }
    await next();
});

app.UseDefaultFiles();
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        var path = ctx.Context.Request.Path.Value ?? "";
        if (path.EndsWith(".html", StringComparison.OrdinalIgnoreCase) || path.EndsWith(".js", StringComparison.OrdinalIgnoreCase))
        {
            ctx.Context.Response.Headers.CacheControl = "no-store, no-cache, must-revalidate, max-age=0";
            ctx.Context.Response.Headers.Pragma = "no-cache";
            ctx.Context.Response.Headers.Expires = "0";
        }
    }
});

app.MapControllers();
app.MapControllerRoute(name: "default", pattern: "{controller=Home}/{action=Index}/{id?}");
app.MapGet("/__ehs_version", () => Results.Text("V61-IMAGES-SQL-BLOB-FIX", "text/plain"));
app.MapFallback(async context =>
{
    if (!(context.User.Identity?.IsAuthenticated ?? false))
    {
        context.Response.Redirect("/login.html");
        return;
    }
    context.Response.Redirect("/index.html");
});

app.Run();
