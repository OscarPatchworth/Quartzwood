using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Quartzwood.Server.DTOs;
using Quartzwood.Server.Services.Access;
using Quartzwood.Server.Services.Cards;

namespace Quartzwood.Server.Controllers;

[ApiController]
[Authorize]   // every endpoint in this controller requires a logged-in user
[Route("api/cards")]
public class CardsController : ControllerBase
{
    private readonly ICardQueryService _query;
    private readonly ICardCommandService _command;
    private readonly IAccessService _access;

    public CardsController(ICardQueryService query, ICardCommandService command, IAccessService access)
    {
        _query = query;
        _command = command;
        _access = access;
    }

    // Searches every card in the Entities you're a member of, by name (partial) or set code (exact)
    [HttpGet("search")]
    [ProducesResponseType(typeof(CardSearchResponseDto), 200)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> Search([FromQuery] string? q)
    {
        var text = q?.Trim() ?? string.Empty;
        if (text.Length < 2) return BadRequest("Search for at least 2 characters.");

        var entityIds = await _access.GetEntityIdsAsync();
        return Ok(await _query.SearchAsync(entityIds, text));
    }

    // Cards in Entities you're not a member of are reported as 404, same as ones that don't exist

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(CardDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetById(Guid id)
    {
        if (!await _access.CanAccessCardAsync(id)) return NotFound();

        var card = await _query.GetByIdAsync(id);
        return card is null ? NotFound() : Ok(card);
    }

    [HttpGet("by-box/{boxId}")]
    [ProducesResponseType(typeof(IEnumerable<CardDto>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetByBox(Guid boxId)
    {
        if (!await _access.CanAccessBoxAsync(boxId)) return NotFound();
        return Ok(await _query.GetByBoxAsync(boxId));
    }

    [HttpGet("by-box/{boxId}/grouped")]
    [ProducesResponseType(typeof(IEnumerable<GroupedCardDto>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetByBoxGrouped(Guid boxId)
    {
        if (!await _access.CanAccessBoxAsync(boxId)) return NotFound();
        return Ok(await _query.GetByBoxGroupedAsync(boxId));
    }

    // Adds dto.Quantity identical copies (default 1) and returns them all
    [HttpPost]
    [ProducesResponseType(typeof(List<CardDto>), 201)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> Add(AddCardDto dto)
    {
        if (!await _access.CanAccessBoxAsync(dto.BoxId)) return BadRequest("Box not found.");

        try
        {
            var created = await _command.AddAsync(dto);
            if (created is null) return BadRequest("Card was not found on Scryfall.");
            return StatusCode(StatusCodes.Status201Created, created);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("{id}")]
    [ProducesResponseType(typeof(CardDto), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Update(Guid id, UpdateCardDto dto)
    {
        if (!await _access.CanAccessCardAsync(id)) return NotFound();
        if (dto.BoxId.HasValue && !await _access.CanAccessBoxAsync(dto.BoxId.Value))
            return BadRequest("Box not found.");

        try
        {
            var updated = await _command.UpdateAsync(id, dto);
            return updated is null ? NotFound() : Ok(updated);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete("{id}")]
    [ProducesResponseType(204)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Delete(Guid id)
    {
        if (!await _access.CanAccessCardAsync(id)) return NotFound();

        var deleted = await _command.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}
