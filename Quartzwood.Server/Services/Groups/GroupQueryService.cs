using Quartzwood.Server.DTOs;
using Quartzwood.Server.Models;
using Quartzwood.Server.Repositories;

namespace Quartzwood.Server.Services.Groups;

public class GroupQueryService : IGroupQueryService
{
    private readonly IGroupRepository _groups;

    public GroupQueryService(IGroupRepository groups)
    {
        _groups = groups;
    }

    public async Task<GroupDto?> GetByIdAsync(Guid id, bool hidePrivate = false)
    {
        var group = await _groups.GetByIdAsync(id);
        return group is null ? null : ToDto(group, hidePrivate);
    }

    public async Task<IEnumerable<GroupDto>> GetAllAsync()
    {
        var groups = await _groups.GetAllAsync();
        return groups.Select(ToDto);
    }

    public async Task<IEnumerable<GroupDto>> GetByEntityAsync(Guid entityId)
    {
        var groups = await _groups.GetByEntityAsync(entityId);
        return groups.Select(ToDto);
    }

    public async Task<IEnumerable<GroupDto>> GetByParentGroupAsync(Guid parentGroupId, bool hidePrivate = false)
    {
        var groups = await _groups.GetByParentGroupAsync(parentGroupId);
        return groups
            .Where(g => !hidePrivate || g.Visibility != Visibility.Private)
            .Select(g => ToDto(g, hidePrivate));
    }

    private static GroupDto ToDto(Group g) => ToDto(g, hidePrivate: false);

    // hidePrivate: for someone viewing an Unlisted/Public group who isn't a member. Inside a group they can see,
    // a child is hidden only if it's set to Private itself (null = same as the group, so visible too)
    private static GroupDto ToDto(Group g, bool hidePrivate) => new(
        g.Id,
        g.Name,
        g.Description,
        g.EntityId,
        g.ParentGroupId,
        g.ChildGroups.Where(c => !hidePrivate || c.Visibility != Visibility.Private).Select(c => c.Name),
        g.Boxes.Where(b => !hidePrivate || b.Visibility != Visibility.Private).Select(b => b.Name),
        Visibility: g.Visibility?.ToString()
    );
}