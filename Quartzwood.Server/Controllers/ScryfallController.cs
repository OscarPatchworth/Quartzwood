using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Quartzwood.Server.DTOs;
using Quartzwood.Server.Services.Scryfall;

namespace Quartzwood.Server.Controllers;

// ScryfallController.cs
[ApiController]
[Authorize]   // every endpoint in this controller requires a logged-in user
[Route("api/scryfall")]
public class ScryfallController : ControllerBase
{
    private readonly IScryfallService _scryfall;
    private readonly ScryfallImageCache _images;

    public ScryfallController(IScryfallService scryfall, ScryfallImageCache images)
    {
        _scryfall = scryfall;
        _images = images;
    }

    // Card names starting with (then containing) the text: the add bar's suggestions while typing
    [HttpGet("autocomplete")]
    [ProducesResponseType(typeof(IEnumerable<string>), 200)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> Autocomplete([FromQuery] string? q)
    {
        var text = q?.Trim() ?? string.Empty;
        if (text.Length < 2) return BadRequest("Type at least 2 characters.");
        return Ok(await _scryfall.AutocompleteAsync(text, limit: 10));
    }

    // The printing a set code + collector number points to, as typed into the add bar (e.g. IKO-1, or IKO-1 -l
    // for a List card): lets the add bar preview the card before adding it
    [HttpGet("printing")]
    [ProducesResponseType(typeof(ScryfallSearchResultDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetPrinting([FromQuery] string setCode, [FromQuery] string setNumber, [FromQuery] bool isList = false)
    {
        // Same set-code rules the add itself uses, so the preview is exactly what will be added
        var (scryfallSetCode, scryfallSetNumber) = ScryfallPrintingKey.Resolve(setCode, setNumber, "None", isList);
        var card = await _scryfall.GetCardAsync(scryfallSetCode, scryfallSetNumber);
        if (card is null) return NotFound();

        return Ok(new ScryfallSearchResultDto(card.Name, card.Set.ToUpper(), card.CollectorNumber, card.Id));
    }

    [HttpGet("search")]
    [ProducesResponseType(typeof(IEnumerable<ScryfallSearchResultDto>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult?> Search([FromQuery] string name, [FromQuery] int? year)
    {
        var results = await _scryfall.SearchAsync(name, year);
        if (results is null)
        {
            return Ok(null);    
        } 

        return Ok(results.Select(c => new ScryfallSearchResultDto(
            c.Name,
            c.Set.ToUpper(),
            c.CollectorNumber,
            c.Id
        )));
    }

    [HttpGet("search/promo")]
    [ProducesResponseType(typeof(IEnumerable<ScryfallSearchResultDto>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult?> SearchPromo([FromQuery] string? name, [FromQuery] int? year, [FromQuery] string? setNumber )
    {
        var results = await _scryfall.SearchPromoAsync(name, year, setNumber);
        if (results is null)
        {
            return Ok(null);    
        } 

        return Ok(results.Select(c => new ScryfallSearchResultDto(
            c.Name,
            c.Set.ToUpper(),
            c.CollectorNumber,
            c.Id
        )));
    }

    // A card's image, served from the on-disk image cache. The first time an image is asked for, it's
    // downloaded once from Scryfall's CDN (using the URL from the local data) and saved; after that it's
    // served from disk, so it works offline and costs Scryfall nothing.
    // No login needed: logged-out visitors viewing an Unlisted/Public box see the card images too.
    // lang (a Scryfall language code, e.g. "ja"): the same printing's image in that language. The local data
    // only has English printings, so that image comes from Scryfall's API (once, then from disk); if Scryfall
    // has no printing in that language, or can't be reached, the English image is served instead
    [AllowAnonymous]
    [HttpGet("cards/{id}/image")]
    [ProducesResponseType(200)]
    [ProducesResponseType(304)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    [ProducesResponseType(503)]
    public async Task<IActionResult> GetImage(string id, [FromQuery] string size = "normal", [FromQuery] string? lang = null,
        CancellationToken ct = default)
    {
        // These two checks matter beyond tidiness: id and size become part of a file path on disk,
        // so only a real GUID and one of two known words are allowed through
        if (!Guid.TryParse(id, out var guid)) return BadRequest("Invalid card id.");
        if (size is not ("small" or "normal")) return BadRequest("Size must be small or normal.");
        if (lang is not null && !System.Text.RegularExpressions.Regex.IsMatch(lang, "^[a-z]{2,3}$"))
            return BadRequest("Invalid language.");
        id = guid.ToString();

        if (lang is not (null or "en") && !_images.IsKnownMissing(id, size, lang))
        {
            var cachedInLang = _images.FindCached(id, size, lang);
            if (cachedInLang is not null) return ServeImage(cachedInLang);

            var printing = (await _scryfall.GetCardsByIdsAsync([id])).GetValueOrDefault(id);
            if (printing is not null)
            {
                var langUrl = $"https://api.scryfall.com/cards/{Uri.EscapeDataString(printing.Set.ToLowerInvariant())}/"
                    + $"{Uri.EscapeDataString(printing.CollectorNumber)}/{lang}?format=image&version={size}";
                var downloadedInLang = await _images.DownloadAsync(id, size, langUrl, ct, lang);
                if (downloadedInLang is not null) return ServeImage(downloadedInLang);
            }
            // No image in that language: the English one below
        }

        // Already on disk: no database lookup, no internet needed
        var cached = _images.FindCached(id, size);
        if (cached is not null) return ServeImage(cached);

        var url = await _scryfall.GetImageUrlAsync(id, size);
        if (url is null) return NotFound();

        var downloaded = await _images.DownloadAsync(id, size, url, ct);
        if (downloaded is not null) return ServeImage(downloaded);

        // Couldn't get it (Scryfall down or unreachable, or requests paused): say so rather than sending the
        // browser to Scryfall itself, which would only add to the requests while it's struggling.
        // The next time the page is opened it's asked for again
        Response.Headers.RetryAfter = "120";
        return StatusCode(StatusCodes.Status503ServiceUnavailable);
    }

    private PhysicalFileResult ServeImage(string path)
    {
        // The browser may reuse the image for a week without asking. After that it asks "has it changed?"
        // using the ETag, and gets a tiny 304 Not Modified instead of the whole image again
        Response.Headers.CacheControl = "private, max-age=604800";
        var file = new FileInfo(path);
        var etag = new Microsoft.Net.Http.Headers.EntityTagHeaderValue($"\"{file.Length:x}-{file.LastWriteTimeUtc.Ticks:x}\"");
        return PhysicalFile(path, "image/jpeg", file.LastWriteTimeUtc, etag);
    }
}