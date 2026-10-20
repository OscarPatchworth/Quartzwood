namespace Quartzwood.Server.Services.Scryfall;

// Bound from the "Scryfall" section of appsettings.json
public class ScryfallOptions
{
    // How old the local copy may get before the importer downloads a fresh one.
    // 1: Scryfall updates prices once a day, so a daily download keeps them current
    public int RefreshDays { get; set; } = 1;

    // Folder (relative to the server project) where card images are kept once they've been viewed
    public string ImageCachePath { get; set; } = "image-cache";
}
