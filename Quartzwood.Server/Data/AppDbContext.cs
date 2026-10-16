using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Quartzwood.Server.Models;

namespace Quartzwood.Server.Data;

// IdentityDbContext adds the AspNetUsers / AspNetRoles / ... tables alongside ours
public class AppDbContext : IdentityDbContext<AppUser, IdentityRole<Guid>, Guid>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Entity> Entities { get; set; }
    public DbSet<Group> Groups { get; set; }
    public DbSet<Box> Boxes { get; set; }
    public DbSet<CardInstance> Cards { get; set; }
    public DbSet<Tag> Tags { get; set; }
    public DbSet<CardTag> CardTags { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Must run first: configures the Identity tables
        base.OnModelCreating(modelBuilder);

        // CardTag composite primary key
        modelBuilder.Entity<CardTag>()
            .HasKey(ct => new { ct.CardInstanceId, ct.TagId });

        // Group self-referential
        modelBuilder.Entity<Group>()
            .HasOne(g => g.ParentGroup)
            .WithMany(g => g.ChildGroups)
            .HasForeignKey(g => g.ParentGroupId)
            .OnDelete(DeleteBehavior.Restrict);

        // Group → Entity
        modelBuilder.Entity<Group>()
            .HasOne(g => g.Entity)
            .WithMany(e => e.Groups)
            .HasForeignKey(g => g.EntityId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}