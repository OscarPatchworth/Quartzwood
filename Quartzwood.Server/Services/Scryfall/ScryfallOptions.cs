namespace Quartzwood.Server.Services.Scryfall;

// Bound from the "Scryfall" section of appsettings.json
public class ScryfallOptions
{
    // How old the local copy may get before the importer downloads a fresh one
    public int RefreshDays { get; set; } = 14;
}
