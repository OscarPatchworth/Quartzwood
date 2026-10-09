using Microsoft.AspNetCore.Mvc;
using Quartzwood.Server.DTOs;
using Quartzwood.Server.Services.Scryfall;

namespace Quartzwood.Server.Controllers;

// ScryfallController.cs
[ApiController]
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
}