using Quartzwood.Server.DTOs;
using Quartzwood.Server.Models;

namespace Quartzwood.Server.Services.Groups;

// Builds "where is this?" paths (root group first, the group itself last) from a list of groups
// loaded in ONE query, by following ParentGroupId up in memory instead of one query per level.
// Each group's path is worked out once and remembered, since many cards/boxes share the same groups
public class GroupPaths
{
    private readonly Dictionary<Guid, Group> _groupsById;
    private readonly Dictionary<Guid, List<LocationStepDto>> _cache = new();

    public GroupPaths(IEnumerable<Group> groups)
    {
        _groupsById = groups.ToDictionary(g => g.Id);
    }

    // The group plus every group inside it, at any depth (e.g. "Binders" and each binder group in it).
    // Empty when the group isn't one of these, so an unknown or someone else's group matches nothing
    public HashSet<Guid> WithDescendants(Guid groupId)
    {
        var result = new HashSet<Guid>();
        if (!_groupsById.ContainsKey(groupId)) return result;

        var toVisit = new Queue<Guid>([groupId]);
        while (toVisit.TryDequeue(out var id))
        {
            if (!result.Add(id)) continue;   // already seen: a safety net against loops
            foreach (var child in _groupsById.Values.Where(g => g.ParentGroupId == id))
                toVisit.Enqueue(child.Id);
        }
        return result;
    }

    public List<LocationStepDto> PathTo(Guid groupId)
    {
        if (_cache.TryGetValue(groupId, out var cached)) return cached;

        var path = new List<LocationStepDto>();
        Guid? currentId = groupId;
        // The step limit is a safety net: group moves already reject loops
        while (currentId is not null && _groupsById.TryGetValue(currentId.Value, out var group)
               && path.Count <= _groupsById.Count)
        {
            path.Insert(0, new LocationStepDto(group.Id, group.Name));
            currentId = group.ParentGroupId;
        }

        _cache[groupId] = path;
        return path;
    }
}
