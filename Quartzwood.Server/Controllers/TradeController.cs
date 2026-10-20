using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Quartzwood.Server.DTOs;
using Quartzwood.Server.Extensions;
using Quartzwood.Server.Services.Cards;
using Quartzwood.Server.Services.Trades;

namespace Quartzwood.Server.Controllers;

[ApiController]
[Authorize]   // every endpoint in this controller requires a logged-in user
[Route("api/trade")]
public class TradeController : ControllerBase
{
    // Trade Options rows: more than a search page shows, since the trade page sorts them by what's affordable
    private const int OptionsLimit = 500;

    private readonly ITradeService _trades;
    private readonly ICardQueryService _query;

    public TradeController(ITradeService trades, ICardQueryService query)
    {
        _trades = trades;
        _query = query;
    }

    // The cards you could trade away: your personal collection, with prices. Same text, sort and filters as
    // collection search (CardSearchQuery: box, group, price, tags, ...), but no text or filter is needed
    [HttpGet("options")]
    [ProducesResponseType(typeof(CardSearchResponseDto), 200)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> Options([FromQuery] string? q, [FromQuery] CardSearchQuery list)
    {
        if (list.Validate() is { } error) return BadRequest(error);

        var personalEntityId = await _trades.GetPersonalEntityIdAsync(User.GetUserId());
        return Ok(await _query.SearchAsync([personalEntityId], q?.Trim() ?? string.Empty, list.ToOptions(), OptionsLimit));
    }

    // Prices the cards you'd receive (nothing is saved)
    [HttpPost("quote")]
    [ProducesResponseType(typeof(TradeQuoteDto), 200)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> Quote(TradeQuoteRequestDto request)
    {
        try
        {
            return Ok(await _trades.QuoteAsync(request.Incoming));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    // Does the trade: incoming cards go into your collection's "Cards from Trade" box (created if needed),
    // outgoing cards are deleted. All or nothing
    [HttpPost]
    [ProducesResponseType(typeof(TradeResultDto), 200)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> Confirm(TradeConfirmDto trade)
    {
        try
        {
            return Ok(await _trades.ConfirmAsync(User.GetUserId(), trade));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }
}
