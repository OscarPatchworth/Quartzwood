using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Quartzwood.Server.DTOs;
using Quartzwood.Server.Models;
using Quartzwood.Server.Services.Access;
using Quartzwood.Server.Services.Boxs;

namespace Quartzwood.Server.Controllers;

[ApiController]
[Authorize]   // every endpoint in this controller requires a logged-in user
[Route("api/boxes")]
public class BoxesController : ControllerBase
{
    private readonly IBoxQueryService _query;
    private readonly IBoxCommandService _command;
    private readonly IAccessService _access;

    public BoxesController(IBoxQueryService query, IBoxCommandService command, IAccessService access)
    {
        _query = query;
        _command = command;
        _access = access;
    }

    // Boxes you can put cards into (for "move to..."): every Entity you're a member of, except ones
    // you can only view. Search by box or group name; no text = all boxes
    [HttpGet("search")]
    [ProducesResponseType(typeof(List<BoxSearchResultDto>), 200)]
    public async Task<IActionResult> Search([FromQuery] string? q)
    {
        var editable = (await _access.GetEntityRolesAsync())
            .Where(entry => entry.Value != EntityRole.Viewer)
            .ToDictionary();
        return Ok(await _query.SearchAsync(editable, q?.Trim() ?? string.Empty));
    }

    // Boxes in Entities you're not a member of are reported as 404, same as ones that don't exist

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(BoxDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetById(Guid id)
    {
        if (!await _access.CanAccessBoxAsync(id)) return NotFound();

        var box = await _query.GetByIdAsync(id);
        return box is null ? NotFound() : Ok(box);
    }

    [HttpGet("by-group/{groupId}")]
    [ProducesResponseType(typeof(IEnumerable<BoxDto>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetByGroup(Guid groupId)
    {
        if (!await _access.CanAccessGroupAsync(groupId)) return NotFound();
        return Ok(await _query.GetByGroupAsync(groupId));
    }

    [HttpPost]
    [ProducesResponseType(typeof(BoxDto), 201)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> Add(AddBoxDto dto)
    {
        if (!await _access.CanAccessGroupAsync(dto.GroupId)) return BadRequest("Group not found.");

        try
        {
            var created = await _command.AddAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("{id}")]
    [ProducesResponseType(typeof(BoxDto), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Update(Guid id, UpdateBoxDto dto)
    {
        if (!await _access.CanAccessBoxAsync(id)) return NotFound();
        if (dto.GroupId.HasValue && !await _access.CanAccessGroupAsync(dto.GroupId.Value))
            return BadRequest("Group not found.");

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
        if (!await _access.CanAccessBoxAsync(id)) return NotFound();

        var deleted = await _command.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}
