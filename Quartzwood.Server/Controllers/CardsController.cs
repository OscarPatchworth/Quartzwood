using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Quartzwood.Server.DTOs;
using Quartzwood.Server.Services.Cards;

namespace Quartzwood.Server.Controllers;

[ApiController]
[Authorize]   // every endpoint in this controller requires a logged-in user
[Route("api/cards")]
public class CardsController : ControllerBase
{
    private readonly ICardQueryService _query;
    private readonly ICardCommandService _command;

    public CardsController(ICardQueryService query, ICardCommandService command)
    {
        _query = query;
        _command = command;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<CardDto>), 200)]
    public async Task<IActionResult> GetAll()
        => Ok(await _query.GetAllAsync());

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(CardDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var card = await _query.GetByIdAsync(id);
        return card is null ? NotFound() : Ok(card);
    }

    [HttpGet("by-box/{boxId}")]
    [ProducesResponseType(typeof(IEnumerable<CardDto>), 200)]
    public async Task<IActionResult> GetByBox(Guid boxId)
        => Ok(await _query.GetByBoxAsync(boxId));

    [HttpGet("by-box/{boxId}/grouped")]
    [ProducesResponseType(typeof(IEnumerable<GroupedCardDto>), 200)]
    public async Task<IActionResult> GetByBoxGrouped(Guid boxId)
        => Ok(await _query.GetByBoxGroupedAsync(boxId));

    [HttpPost]
    [ProducesResponseType(typeof(CardDto), 201)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> Add(AddCardDto dto)
    {
        try
        {
            var created = await _command.AddAsync(dto);
            if (created is null) return BadRequest("Card was not found on Scryfall.");
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("{id}")]
    [ProducesResponseType(typeof(CardDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Update(Guid id, UpdateCardDto dto)
    {
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
        var deleted = await _command.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}