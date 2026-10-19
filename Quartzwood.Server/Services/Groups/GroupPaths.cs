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
