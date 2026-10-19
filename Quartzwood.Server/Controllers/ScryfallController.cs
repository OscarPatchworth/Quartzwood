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

    public ScryfallController(IScryfallService scryfall)
    {
        _scryfall = scryfall;
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

    // A card's image: redirects to Scryfall's image CDN (cards.scryfall.io) using the URL from the local data,
    // so showing images doesn't use Scryfall API calls. Later this can serve images cached on disk instead
    [HttpGet("cards/{id}/image")]
    [ProducesResponseType(302)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    // Lets the browser reuse the redirect for a day instead of asking again on every page load
    [ResponseCache(Duration = 86400, Location = ResponseCacheLocation.Client)]
    public async Task<IActionResult> GetImage(string id, [FromQuery] string size = "normal")
    {
        if (!Guid.TryParse(id, out _)) return BadRequest("Invalid card id.");
        if (size is not ("small" or "normal")) return BadRequest("Size must be small or normal.");

        var url = await _scryfall.GetImageUrlAsync(id, size);
        return url is null ? NotFound() : Redirect(url);
    }
}