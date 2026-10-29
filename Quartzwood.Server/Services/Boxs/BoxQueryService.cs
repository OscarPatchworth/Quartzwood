using Quartzwood.Server.DTOs;
using Quartzwood.Server.Models;
using Quartzwood.Server.Repositories;
using Quartzwood.Server.Services.Groups;

namespace Quartzwood.Server.Services.Boxs;

public class BoxQueryService : IBoxQueryService
{
    // Most boxes one search returns: plenty for a dropdown
    private const int SearchLimit = 50;

    private readonly IBoxRepository _boxes;
    private readonly IGroupRepository _groups;

    public BoxQueryService(IBoxRepository boxes, IGroupRepository groups)
    {
        _boxes = boxes;
        _groups = groups;
    }

    public async Task<List<BoxSearchResultDto>> SearchAsync(IReadOnlyDictionary<Guid, EntityRole> entityRoles, string text)
    {
        var entityIds = entityRoles.Keys.ToList();
        // Two queries (boxes, groups), then everything else in memory: even a big collection
        // has hundreds of boxes, not millions, so this is simpler than a clever SQL search
        var boxes = await _boxes.GetByEntitiesAsync(entityIds);
        var paths = new GroupPaths(await _groups.GetTreeByEntitiesAsync(entityIds));

        var results = boxes.Select(b => new BoxSearchResultDto(
            b.Id,
            b.Name,
            b.Group.EntityId,
            b.Group.Entity.Name,
            entityRoles[b.Group.EntityId] == EntityRole.Owner,
            paths.PathTo(b.GroupId)
        ));

        if (text.Length > 0)
        {
            // Matching a group name too: "binder" finds every box inside a "Binders" group
            results = results.Where(r =>
                r.Name.Contains(text, StringComparison.OrdinalIgnoreCase)
                || r.GroupPath.Any(step => step.Name.Contains(text, StringComparison.OrdinalIgnoreCase)));
        }

        return results
            .OrderByDescending(r => r.IsOwned)
            // Boxes whose OWN name matches come before ones that only matched a group, and "starts with" first of all
            .ThenByDescending(r => text.Length > 0 && r.Name.StartsWith(text, StringComparison.OrdinalIgnoreCase))
            .ThenByDescending(r => text.Length > 0 && r.Name.Contains(text, StringComparison.OrdinalIgnoreCase))
            .ThenBy(r => r.EntityName)
            .ThenBy(r => string.Join("/", r.GroupPath.Select(step => step.Name)) + "/" + r.Name)
            .Take(SearchLimit)
            .ToList();
    }

    public async Task<BoxDto?> GetByIdAsync(Guid id)
    {
        var box = await _boxes.GetByIdAsync(id);
        return box is null ? null : ToDto(box);
    }

    public async Task<IEnumerable<BoxDto>> GetAllAsync()
    {
        var boxes = await _boxes.GetAllAsync();
        return boxes.Select(ToDto);
    }

    public async Task<IEnumerable<BoxDto>> GetByGroupAsync(Guid groupId, bool hidePrivate = false)
    {
        var boxes = await _boxes.GetByGroupAsync(groupId);
        // For viewers who aren't members: inside a group they can see, only boxes set to Private themselves are hidden
        return boxes.Where(b => !hidePrivate || b.Visibility != Visibility.Private).Select(ToDto);
    }

    private static BoxDto ToDto(Box b) => new(
        b.Id,
        b.Name,
        b.GroupId,
        b.Cards.Count,
        Visibility: b.Visibility?.ToString()
    );
}