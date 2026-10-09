using EHS_FieldVisits_SQLServer.Models;
using Microsoft.EntityFrameworkCore;

namespace EHS_FieldVisits_SQLServer.Data;
public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Visit> Visits => Set<Visit>();
    public DbSet<VisitImage> VisitImages => Set<VisitImage>();
    public DbSet<Report> Reports => Set<Report>();
    public DbSet<AppUser> Users => Set<AppUser>();
    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Visit>().HasMany(x => x.Images).WithOne(x => x.Visit).HasForeignKey(x => x.VisitId).OnDelete(DeleteBehavior.Cascade);
        b.Entity<AppUser>().HasIndex(x => x.Username).IsUnique();
    }
}
