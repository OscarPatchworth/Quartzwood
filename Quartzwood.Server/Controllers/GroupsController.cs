using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Quartzwood.Server.DTOs;
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

    // Groups in Entities you're not a member of are reported as 404, same as ones that don't exist

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(GroupDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetById(Guid id)
    {
        if (!await _access.CanAccessGroupAsync(id)) return NotFound();

        var group = await _query.GetByIdAsync(id);
        return group is null ? NotFound() : Ok(group);
    }

    [HttpGet("by-entity/{entityId}")]
    [ProducesResponseType(typeof(IEnumerable<GroupDto>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetByEntity(Guid entityId)
    {
        if (!await _access.CanAccessEntityAsync(entityId)) return NotFound();
        return Ok(await _query.GetByEntityAsync(entityId));
    }

    [HttpGet("by-parent/{parentId}")]
    [ProducesResponseType(typeof(IEnumerable<GroupDto>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetByParent(Guid parentId)
    {
        // Child groups always share the parent's Entity, so checking the parent covers them all
        if (!await _access.CanAccessGroupAsync(parentId)) return NotFound();
        return Ok(await _query.GetByParentGroupAsync(parentId));
    }

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
