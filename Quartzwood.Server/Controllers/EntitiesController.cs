using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Quartzwood.Server.DTOs;
using Quartzwood.Server.Services.Access;
using Quartzwood.Server.Services.Entities;

namespace Quartzwood.Server.Controllers;

// Creating/deleting Entities isn't exposed yet: a new Entity needs an Owner membership and a root group,
// which only registration sets up for now. Comes back with clubs/shops
[ApiController]
[Authorize]   // every endpoint in this controller requires a logged-in user
[Route("api/entities")]
public class EntitiesController : ControllerBase
{
    private readonly IEntityQueryService _query;
    private readonly IEntityCommandService _command;
    private readonly IAccessService _access;

    public EntitiesController(IEntityQueryService query, IEntityCommandService command, IAccessService access)
    {
        _query = query;
        _command = command;
        _access = access;
    }

    // Only the Entities you're a member of
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<EntityDto>), 200)]
    public async Task<IActionResult> GetMine()
    {
        var entities = new List<EntityDto>();
        foreach (var entityId in await _access.GetEntityIdsAsync())
        {
            var entity = await _query.GetByIdAsync(entityId);
            if (entity is not null) entities.Add(entity);
        }
        return Ok(entities);
    }

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(EntityDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetById(Guid id)
    {
        if (!await _access.CanAccessEntityAsync(id)) return NotFound();

        var entity = await _query.GetByIdAsync(id);
        return entity is null ? NotFound() : Ok(entity);
    }

    // Owners only: other members get 403, non-members 404
    [HttpPut("{id}")]
    [ProducesResponseType(typeof(EntityDto), 200)]
    [ProducesResponseType(403)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Update(Guid id, UpdateEntityDto dto)
    {
        if (!await _access.CanAccessEntityAsync(id)) return NotFound();
        if (!await _access.IsEntityOwnerAsync(id)) return Forbid();

        var updated = await _command.UpdateAsync(id, dto);
        return updated is null ? NotFound() : Ok(updated);
    }
}
