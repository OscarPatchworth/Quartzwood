using System.ComponentModel.DataAnnotations;

namespace Quartzwood.Server.Models;

public enum Condition { NM, LP, MP, HP, DMG }
public enum FoilType { None, Traditional, Other }
public enum StampType { None, Promo, Prerelease }
public enum NameSource { Scryfall, Manual, Unknown }

public class CardInstance
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid? BoxId { get; set; }
    public Box? Box { get; set; }

    // Printed
    public string? SetCode { get; set; }
    public string? SetNumber { get; set; }
    public string? Name { get; set; }
    public NameSource NameSource { get; set; } = NameSource.Unknown;
    public string Language { get; set; } = "en";

    // Physical
    public Condition Condition { get; set; } = Condition.NM;
    public FoilType FoilType { get; set; } = FoilType.None;
    public StampType StampType { get; set; } = StampType.None;

    // Alteration
    public bool IsProxy { get; set; } = false;
    public bool IsSigned { get; set; } = false;
    public string? AlterArtist { get; set; }
    public string? AlterDescription { get; set; }
    public string? AlterPhotoPath { get; set; }

    // Meta
    public string? ScryfallId { get; set; }
    public DateOnly? AcquiredDate { get; set; }
    public decimal? PurchasePrice { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public ICollection<CardTag> CardTags { get; set; } = new List<CardTag>();
}