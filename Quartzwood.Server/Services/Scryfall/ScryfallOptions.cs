namespace Quartzwood.Server.Services.Scryfall;

// Bound from the "Scryfall" section of appsettings.json
public class ScryfallOptions
{
    // How old the local copy may get before the importer downloads a fresh one
    public int RefreshDays { get; set; } = 14;

    // Folder (relative to the server project) where card images are kept once they've been viewed
    public string ImageCachePath { get; set; } = "image-cache";
}
