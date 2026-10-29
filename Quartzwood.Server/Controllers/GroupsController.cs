using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Quartzwood.Server.DTOs;
using Quartzwood.Server.Models;
using Quartzwood.Server.Services.Access;
using Quartzwood.Server.Services.Groups;

namespace Quartzwood.Server.Controllers;

[ApiController]
[Authorize]   // every endpoint in this controller requires a logged-in user
[Route("api/groups")]
public class GroupsController : ControllerBase
{
    private readonly IGroupQueryService _query;
    private readonly IGroupCommandService _command;
    private readonly IAccessService _access;

    public GroupsController(IGroupQueryService query, IGroupCommandService command, IAccessService access)
    {
        _query = query;
        _command = command;
        _access = access;
    }

    // Groups you can't see (Private ones in Entities you're not a member of) are reported as 404,
    // same as ones that don't exist

    // Anyone can view an Unlisted/Public group by its link, even logged out (see Visibility)
    [AllowAnonymous]
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(GroupDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetById(Guid id)
    {
        if (!await _access.CanViewGroupAsync(id)) return NotFound();

        var canEdit = await _access.CanAccessGroupAsync(id);
        var group = await _query.GetByIdAsync(id, hidePrivate: !canEdit);
        if (group is null) return NotFound();

        var inherited = group.ParentGroupId is { } parentId
            ? await _access.GetGroupVisibilityAsync(parentId)
            : Visibility.Private;
        return Ok(WithAccess(group, inherited, canEdit, canEdit && await _access.IsGroupOwnerAsync(id)));
    }

    [HttpGet("by-entity/{entityId}")]
    [ProducesResponseType(typeof(IEnumerable<GroupDto>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetByEntity(Guid entityId)
    {
        if (!await _access.CanAccessEntityAsync(entityId)) return NotFound();
        return Ok(await _query.GetByEntityAsync(entityId));
    }

    // Viewers who aren't members only get the children not set to Private
    [AllowAnonymous]
    [HttpGet("by-parent/{parentId}")]
    [ProducesResponseType(typeof(IEnumerable<GroupDto>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetByParent(Guid parentId)
    {
        // Child groups always share the parent's Entity, so checking the parent covers them all
        if (!await _access.CanViewGroupAsync(parentId)) return NotFound();

        var canEdit = await _access.CanAccessGroupAsync(parentId);
        var isOwner = canEdit && await _access.IsGroupOwnerAsync(parentId);
        // "Same as parent" means the same thing for every child: the parent's effective visibility
        var inherited = await _access.GetGroupVisibilityAsync(parentId);
        var groups = await _query.GetByParentGroupAsync(parentId, hidePrivate: !canEdit);
        return Ok(groups.Select(g => WithAccess(g, inherited, canEdit, isOwner)));
    }

    // Owner only: Private, Unlisted, Public, or null = same as the parent group
    [HttpPut("{id}/visibility")]
    [ProducesResponseType(typeof(GroupDto), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> SetVisibility(Guid id, SetVisibilityDto dto)
    {
        if (!await _access.CanAccessGroupAsync(id)) return NotFound();
        if (!await _access.IsGroupOwnerAsync(id)) return StatusCode(403, "Only the owner can change who can see this.");
        if (!VisibilityText.TryParse(dto.Visibility, out var visibility))
            return BadRequest("Visibility must be Private, Unlisted, Public, or empty for 'same as parent'.");

        if (!await _command.SetVisibilityAsync(id, visibility)) return NotFound();
        return await GetById(id);
    }

    // Adds what depends on who's asking: what "same as parent" means here, and what they may do
    private static GroupDto WithAccess(GroupDto group, Visibility inherited, bool canEdit, bool isOwner) => group with
    {
        InheritedVisibility = inherited.ToString(),
        EffectiveVisibility = group.Visibility ?? inherited.ToString(),
        CanEdit = canEdit,
        CanChangeVisibility = isOwner,
    };

    [HttpPost]
    [ProducesResponseType(typeof(GroupDto), 201)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> Add(AddGroupDto dto)
    {
        if (!await _access.CanAccessGroupAsync(dto.ParentGroupId)) return BadRequest("Parent group not found.");

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
    [ProducesResponseType(typeof(GroupDto), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Update(Guid id, UpdateGroupDto dto)
    {
        if (!await _access.CanAccessGroupAsync(id)) return NotFound();
        if (dto.ParentGroupId.HasValue && !await _access.CanAccessGroupAsync(dto.ParentGroupId.Value))
            return BadRequest("Parent group not found.");

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
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Delete(Guid id)
    {
        if (!await _access.CanAccessGroupAsync(id)) return NotFound();

        try
        {
            var deleted = await _command.DeleteAsync(id);
            return deleted ? NoContent() : NotFound();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }
}
