using Microsoft.AspNetCore.Mvc;
using Quartzwood.Server.Data;
using Quartzwood.Server.DTOs;
using Quartzwood.Server.Models;
using Microsoft.EntityFrameworkCore;

namespace Quartzwood.Server.Controllers;

[ApiController]
[Route("api/breadcrumb")]
public class BreadcrumbController : ControllerBase
{
    private readonly AppDbContext _context;

    public BreadcrumbController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(BreadcrumbDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetBreadcrumb(Guid id)
    {
        // Try Entity
        var entity = await _context.Entities.FindAsync(id);
        if (entity != null)
            return Ok(new BreadcrumbDto(
                entity.Name, entity.Id.ToString(),
                null, null, false, null, null, null, null));

        // Try Group
        var group = await _context.Groups
            .Include(g => g.Entity)
            .FirstOrDefaultAsync(g => g.Id == id);
        if (group != null)
        {
            var chain = await WalkChain(group);
            return Ok(new BreadcrumbDto(
                chain.EntityName, chain.EntityId,
                chain.RootGroup?.Name, chain.RootGroup?.Id.ToString(),
                chain.HasCollapsed,
                null, null,
                null, null));
        }

        // Try Box
        var box = await _context.Boxes
            .Include(b => b.Group)
            .FirstOrDefaultAsync(b => b.Id == id);
        if (box != null && box.Group != null)
        {
            var chain = await WalkChain(box.Group);
            return Ok(new BreadcrumbDto(
                chain.EntityName, chain.EntityId,
                chain.RootGroup?.Name, chain.RootGroup?.Id.ToString(),
                chain.HasCollapsed,
                box.Group.Name, box.GroupId.ToString(),
                box.Name, box.Id.ToString()));
        }

        return NotFound();
    }

    private record ChainResult(
        string? EntityName,
        string? EntityId,
        Group? RootGroup,
        Group? ImmediateParent,
        bool HasCollapsed
    );

    private async Task<ChainResult> WalkChain(Group startGroup)
    {
        var chain = new List<Group>();
        var current = startGroup;

        // Walk up to root
        while (current != null)
        {
            chain.Insert(0, current);
            if (current.ParentGroupId == null) break;
            current = await _context.Groups
                .Include(g => g.Entity)
                .FirstOrDefaultAsync(g => g.Id == current.ParentGroupId);
        }

        // Every group stores its Entity, so no need to start from the root
        var root = chain.First();
        var entity = await _context.Entities.FindAsync(startGroup.EntityId);

        var hasCollapsed = chain.Count > 2;
        var immediateParent = chain.Count > 1 ? chain.Last() : null;

        return new ChainResult(
            entity?.Name, entity?.Id.ToString(),
            root,
            immediateParent,
            hasCollapsed
        );
    }
}