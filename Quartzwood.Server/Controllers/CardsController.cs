using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Quartzwood.Server.DTOs;
using Quartzwood.Server.Services.Access;
using Quartzwood.Server.Extensions;
using Quartzwood.Server.Services.Cards;
using Quartzwood.Server.Services.Tags;

namespace Quartzwood.Server.Controllers;

[ApiController]
[Authorize]   // every endpoint in this controller requires a logged-in user
[Route("api/cards")]
public class CardsController : ControllerBase
{
    private readonly ICardQueryService _query;
    private readonly ICardCommandService _command;
    private readonly IAccessService _access;
    private readonly ITagService _tags;

    public CardsController(ICardQueryService query, ICardCommandService command, IAccessService access, ITagService tags)
    {
        _query = query;
        _command = command;
        _access = access;
        _tags = tags;
    }

    // Searches every card in the Entities you're a member of, by name (partial) or set code (exact).
    // Sort and filters: see CardListQuery / CardSearchQuery. With a filter, the text can be short or empty
    [HttpGet("search")]
    [ProducesResponseType(typeof(CardSearchResponseDto), 200)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> Search([FromQuery] string? q, [FromQuery] CardSearchQuery list)
    {
        if (list.Validate() is { } error) return BadRequest(error);
        var options = list.ToOptions();

        var text = q?.Trim() ?? string.Empty;
        // The 2-character minimum stops a 1-letter search matching half the collection; a filter narrows it anyway
        if (text.Length < 2 && !options.HasFilter)
            return BadRequest("Search for at least 2 characters, or set a filter.");

        var entityIds = await _access.GetEntityIdsAsync();
        return Ok(await _query.SearchAsync(entityIds, text, options));
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

    // Same sort and filter options as search (see CardListQuery)
    [HttpGet("by-box/{boxId}/grouped")]
    [ProducesResponseType(typeof(IEnumerable<GroupedCardDto>), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetByBoxGrouped(Guid boxId, [FromQuery] CardListQuery list)
    {
        if (!await _access.CanAccessBoxAsync(boxId)) return NotFound();
        if (list.Validate() is { } error) return BadRequest(error);
        return Ok(await _query.GetByBoxGroupedAsync(boxId, list.ToOptions()));
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

    // ---- Mass actions ----
    // All or nothing: if ANY id isn't one of your cards, nothing changes (404, like a single unknown card).
    // POST rather than PUT/DELETE: these act on a list sent in the body, not on one URL's resource

    // Most cards one mass action may touch: a whole large box at once, but not an accidental runaway list
    private const int MaxBulkCards = 5000;

    [HttpPost("bulk/update")]
    [ProducesResponseType(typeof(BulkResultDto), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public Task<IActionResult> BulkUpdate(BulkUpdateCardsDto dto)
        => RunBulkAsync(dto.CardIds, ids => _command.UpdateManyAsync(ids, dto));

    [HttpPost("bulk/move")]
    [ProducesResponseType(typeof(BulkResultDto), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> BulkMove(BulkMoveCardsDto dto)
    {
        if (!await _access.CanAccessBoxAsync(dto.BoxId)) return BadRequest("Box not found.");
        return await RunBulkAsync(dto.CardIds, ids => _command.MoveManyAsync(ids, dto.BoxId));
    }

    // Add and/or remove tags by name, on one card or many (the card panel and mass edit both use this)
    [HttpPost("bulk/tags")]
    [ProducesResponseType(typeof(BulkResultDto), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public Task<IActionResult> BulkTags(BulkTagsDto dto)
        => RunBulkAsync(dto.CardIds, ids => _tags.ChangeTagsAsync(ids, dto.Add, dto.Remove, User.GetUserId()));

    [HttpPost("bulk/delete")]
    [ProducesResponseType(typeof(BulkResultDto), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public Task<IActionResult> BulkDelete(BulkCardIdsDto dto)
        => RunBulkAsync(dto.CardIds, _command.DeleteManyAsync);

    // The checks every mass action shares, then the action itself
    private async Task<IActionResult> RunBulkAsync(List<Guid> cardIds, Func<IReadOnlyCollection<Guid>, Task<int>> action)
    {
        // Distinct: the same card sent twice must still count once in the access check
        var ids = cardIds.Distinct().ToList();
        if (ids.Count == 0) return BadRequest("No cards selected.");
        if (ids.Count > MaxBulkCards) return BadRequest($"At most {MaxBulkCards} cards at once.");
        if (!await _access.CanAccessCardsAsync(ids)) return NotFound();

        try
        {
            return Ok(new BulkResultDto(await action(ids)));
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
