using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Quartzwood.Server.DTOs;
using Quartzwood.Server.Services.Groups;

namespace Quartzwood.Server.Controllers;

[ApiController]
[Authorize]   // every endpoint in this controller requires a logged-in user
[Route("api/groups")]
public class GroupsController : ControllerBase
{
    private readonly IGroupQueryService _query;
    private readonly IGroupCommandService _command;

    public GroupsController(IGroupQueryService query, IGroupCommandService command)
    {
        _query = query;
        _command = command;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<GroupDto>), 200)]
    public async Task<IActionResult> GetAll()
        => Ok(await _query.GetAllAsync());

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(GroupDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var group = await _query.GetByIdAsync(id);
        return group is null ? NotFound() : Ok(group);
    }

    [HttpGet("by-entity/{entityId}")]
    [ProducesResponseType(typeof(IEnumerable<GroupDto>), 200)]
    public async Task<IActionResult> GetByEntity(Guid entityId)
        => Ok(await _query.GetByEntityAsync(entityId));

    [HttpGet("by-parent/{parentId}")]
    [ProducesResponseType(typeof(IEnumerable<GroupDto>), 200)]
    public async Task<IActionResult> GetByParent(Guid parentId)
        => Ok(await _query.GetByParentGroupAsync(parentId));

    [HttpPost]
    [ProducesResponseType(typeof(GroupDto), 201)]
    public async Task<IActionResult> Add(AddGroupDto dto)
    {
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
    [ProducesResponseType(404)]
    public async Task<IActionResult> Update(Guid id, UpdateGroupDto dto)
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
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Delete(Guid id)
    {
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