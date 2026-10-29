using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Quartzwood.Server.DTOs;
using Quartzwood.Server.Services.Access;
using Quartzwood.Server.Services.Dividers;

namespace Quartzwood.Server.Controllers;

[ApiController]
[Authorize]   // every endpoint in this controller requires a logged-in user
[Route("api/dividers")]
public class DividersController : ControllerBase
{
    private readonly IDividerService _dividers;
    private readonly IAccessService _access;

    public DividersController(IDividerService dividers, IAccessService access)
    {
        _dividers = dividers;
        _access = access;
    }

    // Dividers in boxes in Entities you're not a member of are reported as 404, same as ones that don't exist

    // Front of the box first. Viewable by anyone when the box is Unlisted/Public (see Visibility)
    [AllowAnonymous]
    [HttpGet("by-box/{boxId}")]
    [ProducesResponseType(typeof(List<DividerDto>), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetByBox(Guid boxId)
    {
        if (!await _access.CanViewBoxAsync(boxId)) return NotFound();
        return Ok(await _dividers.GetByBoxAsync(boxId));
    }

    // Goes at the back of the box
    [HttpPost]
    [ProducesResponseType(typeof(DividerDto), 201)]
    [ProducesResponseType(400)]
    public async Task<IActionResult> Add(AddDividerDto dto)
    {
        if (!await _access.CanAccessBoxAsync(dto.BoxId)) return BadRequest("Box not found.");

        try
        {
            var created = await _dividers.AddAsync(dto);
            return StatusCode(StatusCodes.Status201Created, created);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("{id}")]
    [ProducesResponseType(typeof(DividerDto), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Rename(Guid id, UpdateDividerDto dto)
    {
        if (!await _access.CanAccessDividerAsync(id)) return NotFound();

        try
        {
            var updated = await _dividers.RenameAsync(id, dto.Name);
            return updated is null ? NotFound() : Ok(updated);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("by-box/{boxId}/order")]
    [ProducesResponseType(typeof(List<DividerDto>), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Reorder(Guid boxId, ReorderDividersDto dto)
    {
        if (!await _access.CanAccessBoxAsync(boxId)) return NotFound();

        try
        {
            return Ok(await _dividers.ReorderAsync(boxId, dto.DividerIds));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    // Its cards stay in the box, behind no divider
    [HttpDelete("{id}")]
    [ProducesResponseType(204)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Delete(Guid id)
    {
        if (!await _access.CanAccessDividerAsync(id)) return NotFound();

        var deleted = await _dividers.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}
