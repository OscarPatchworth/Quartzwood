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

    // Boxes you can't see (Private ones in Entities you're not a member of) are reported as 404,
    // same as ones that don't exist

    // Anyone can view an Unlisted/Public box by its link, even logged out (see Visibility)
    [AllowAnonymous]
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(BoxDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetById(Guid id)
    {
        if (!await _access.CanViewBoxAsync(id)) return NotFound();

        var box = await _query.GetByIdAsync(id);
        if (box is null) return NotFound();

        var canEdit = await _access.CanAccessBoxAsync(id);
        var inherited = await _access.GetGroupVisibilityAsync(box.GroupId);
        return Ok(WithAccess(box, inherited, canEdit, canEdit && await _access.IsGroupOwnerAsync(box.GroupId)));
    }

    // Viewers who aren't members only get the boxes not set to Private
    [AllowAnonymous]
    [HttpGet("by-group/{groupId}")]
    [ProducesResponseType(typeof(IEnumerable<BoxDto>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetByGroup(Guid groupId)
    {
        if (!await _access.CanViewGroupAsync(groupId)) return NotFound();

        var canEdit = await _access.CanAccessGroupAsync(groupId);
        var isOwner = canEdit && await _access.IsGroupOwnerAsync(groupId);
        var inherited = await _access.GetGroupVisibilityAsync(groupId);
        var boxes = await _query.GetByGroupAsync(groupId, hidePrivate: !canEdit);
        return Ok(boxes.Select(b => WithAccess(b, inherited, canEdit, isOwner)));
    }

    // Owner only: Private, Unlisted, Public, or null = same as the group it's in
    [HttpPut("{id}/visibility")]
    [ProducesResponseType(typeof(BoxDto), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> SetVisibility(Guid id, SetVisibilityDto dto)
    {
        if (!await _access.CanAccessBoxAsync(id)) return NotFound();
        var box = await _query.GetByIdAsync(id);
        if (box is null) return NotFound();
        if (!await _access.IsGroupOwnerAsync(box.GroupId)) return StatusCode(403, "Only the owner can change who can see this.");
        if (!VisibilityText.TryParse(dto.Visibility, out var visibility))
            return BadRequest("Visibility must be Private, Unlisted, Public, or empty for 'same as its group'.");

        if (!await _command.SetVisibilityAsync(id, visibility)) return NotFound();
        return await GetById(id);
    }

    // Adds what depends on who's asking: what "same as its group" means here, and what they may do
    private static BoxDto WithAccess(BoxDto box, Visibility inherited, bool canEdit, bool isOwner) => box with
    {
        InheritedVisibility = inherited.ToString(),
        EffectiveVisibility = box.Visibility ?? inherited.ToString(),
        CanEdit = canEdit,
        CanChangeVisibility = isOwner,
    };

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
