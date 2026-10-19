using Microsoft.Extensions.Options;

namespace Quartzwood.Server.Services.Scryfall;

// Keeps a copy on disk of every card image that's been shown, so each image is downloaded from
// Scryfall's CDN once and then served locally (works offline, and costs Scryfall nothing after the first view).
//
// Registered as a Singleton: it holds no per-request state (unlike services that use a DbContext),
// so one shared instance serves every request
public class ScryfallImageCache
{
    public const string HttpClientName = "ScryfallImages";

    // Only ever download from Scryfall: the URL comes from our own data, but this makes sure of it
    private static readonly string[] AllowedHosts = ["cards.scryfall.io", "api.scryfall.com"];

    private readonly IHttpClientFactory _httpFactory;
    private readonly ILogger<ScryfallImageCache> _logger;
    private readonly string _root;

    public ScryfallImageCache(IHttpClientFactory httpFactory, IOptions<ScryfallOptions> options,
        IWebHostEnvironment environment, ILogger<ScryfallImageCache> logger)
    {
        _httpFactory = httpFactory;
        _logger = logger;
        // ContentRootPath = the server project's folder, so this is Quartzwood.Server/image-cache by default
        _root = Path.GetFullPath(Path.Combine(environment.ContentRootPath, options.Value.ImageCachePath));
    }

    // e.g. image-cache/normal/d8/d8a2e243-....jpg - the 2-character sub-folder stops one folder
    // ending up with tens of thousands of files in it, which some tools handle badly.
    // Only call with a validated GUID id and size ("small"/"normal"): they become part of the path
    private string PathFor(string scryfallId, string size)
        => Path.Combine(_root, size, scryfallId[..2], $"{scryfallId}.jpg");

    public string? FindCached(string scryfallId, string size)
    {
        var path = PathFor(scryfallId, size);
        return File.Exists(path) ? path : null;
    }

    // Downloads the image into the cache and returns its path; null if it couldn't be downloaded (e.g. offline)
    public async Task<string?> DownloadAsync(string scryfallId, string size, string sourceUrl, CancellationToken ct)
    {
        if (!Uri.TryCreate(sourceUrl, UriKind.Absolute, out var uri) || !AllowedHosts.Contains(uri.Host))
            return null;

        var path = PathFor(scryfallId, size);
        // Download to a temporary file first, then move it into place in one step: a half-finished
        // download (server stopped, connection dropped) can then never be served as if it were the image
        var tempPath = $"{path}.{Guid.NewGuid():N}.tmp";
        try
        {
            var http = _httpFactory.CreateClient(HttpClientName);
            using var response = await http.GetAsync(uri, HttpCompletionOption.ResponseHeadersRead, ct);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Image download for {Id} ({Size}) failed: {Status}", scryfallId, size, response.StatusCode);
                return null;
            }

            Directory.CreateDirectory(Path.GetDirectoryName(path)!);
            await using (var file = File.Create(tempPath))
            {
                await response.Content.CopyToAsync(file, ct);
            }
            // overwrite: two requests for the same new image can race; either copy is fine
            File.Move(tempPath, path, overwrite: true);
            return path;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Image download for {Id} ({Size}) failed", scryfallId, size);
            return null;
        }
        finally
        {
            if (File.Exists(tempPath)) File.Delete(tempPath);
        }
    }
}
