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
    public DbSet<EntityMember> EntityMembers { get; set; }

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

        // Box → Group: GroupCommandService deletes a group's boxes itself, so block accidental DB-level deletes
        modelBuilder.Entity<Box>()
            .HasOne(b => b.Group)
            .WithMany(g => g.Boxes)
            .HasForeignKey(b => b.GroupId)
            .OnDelete(DeleteBehavior.Restrict);

        // Card → Box: deleting a box deletes the cards in it
        modelBuilder.Entity<CardInstance>()
            .HasOne(c => c.Box)
            .WithMany(b => b.Cards)
            .HasForeignKey(c => c.BoxId)
            .OnDelete(DeleteBehavior.Cascade);

        // EntityMember composite primary key: a user can only be in an entity once
        modelBuilder.Entity<EntityMember>()
            .HasKey(m => new { m.EntityId, m.UserId });

        // EntityMember → Entity: deleting an entity removes its memberships
        modelBuilder.Entity<EntityMember>()
            .HasOne(m => m.Entity)
            .WithMany(e => e.Members)
            .HasForeignKey(m => m.EntityId)
            .OnDelete(DeleteBehavior.Cascade);

        // EntityMember → User: deleting a user removes their memberships
        modelBuilder.Entity<EntityMember>()
            .HasOne(m => m.User)
            .WithMany(u => u.Memberships)
            .HasForeignKey(m => m.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Fast "which entities is this user in?" lookups
        modelBuilder.Entity<EntityMember>()
            .HasIndex(m => m.UserId);
    }
}