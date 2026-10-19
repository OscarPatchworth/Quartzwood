using Microsoft.EntityFrameworkCore;
using Quartzwood.Server.Models.Scryfall;

namespace Quartzwood.Server.Data;

// Local copy of Scryfall's card data, kept in its own file (scryfall.db) separate from user data.
// It's a cache: deleting scryfall.db is safe, the importer downloads it again
public class ScryfallDbContext : DbContext
{
    public ScryfallDbContext(DbContextOptions<ScryfallDbContext> options) : base(options) { }

    public DbSet<ScryfallPrinting> Printings { get; set; }
    public DbSet<ScryfallImportState> ImportState { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var printing = modelBuilder.Entity<ScryfallPrinting>();
        printing.HasKey(p => p.Id);

        // NOCASE: "IKO"/"iko" and "sol ring"/"Sol Ring" compare equal, and the indexes below still apply
        printing.Property(p => p.SetCode).UseCollation("NOCASE");
        printing.Property(p => p.CollectorNumber).UseCollation("NOCASE");
        printing.Property(p => p.Name).UseCollation("NOCASE");
        printing.Property(p => p.FrontFaceName).UseCollation("NOCASE");

        // Adding a card: look up by set + collector number
        printing.HasIndex(p => new { p.SetCode, p.CollectorNumber });
        // Add-bar name search: every printing of an exact name
        printing.HasIndex(p => p.Name);
        printing.HasIndex(p => p.FrontFaceName);

        modelBuilder.Entity<ScryfallImportState>().HasKey(s => s.Id);
    }
}
