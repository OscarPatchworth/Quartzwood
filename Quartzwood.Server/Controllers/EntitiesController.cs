using Microsoft.AspNetCore.Mvc;
using Quartzwood.Server.DTOs;
using Quartzwood.Server.Services.Entities;

namespace Quartzwood.Server.Controllers;

[ApiController]
[Route("api/entities")]
public class EntitiesController : ControllerBase
{
    private readonly IEntityQueryService _query;
    private readonly IEntityCommandService _command;

    public EntitiesController(IEntityQueryService query, IEntityCommandService command)
    {
        _query = query;
        _command = command;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<EntityDto>), 200)]
    public async Task<IActionResult> GetAll()
        => Ok(await _query.GetAllAsync());

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(EntityDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var entity = await _query.GetByIdAsync(id);
        return entity is null ? NotFound() : Ok(entity);
    }

    [HttpPost]
    public async Task<IActionResult> Add(AddEntityDto dto)
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
    public async Task<IActionResult> Update(Guid id, UpdateEntityDto dto)
    {
        var updated = await _command.UpdateAsync(id, dto);
        return updated is null ? NotFound() : Ok(updated);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await _command.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}