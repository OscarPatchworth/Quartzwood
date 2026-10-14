using Quartzwood.Server.DTOs;
using Quartzwood.Server.Models;
using Quartzwood.Server.Repositories;
using Quartzwood.Server.Services.Boxs;

namespace Quartzwood.Server.Services.Groups;

public class GroupCommandService : IGroupCommandService
{
    private readonly IGroupRepository _groups;
    private readonly IBoxCommandService _boxCommand;

    public GroupCommandService(IGroupRepository groups, IBoxCommandService boxCommand)
    {
        _groups = groups;
        _boxCommand = boxCommand;
    }

    public async Task<GroupDto> AddAsync(AddGroupDto dto)
    {
        if (dto.EntityId is null && dto.ParentGroupId is null)
            throw new ArgumentException("Group must belong to either an Entity or a parent Group.");

        if (dto.EntityId is not null && dto.ParentGroupId is not null)
            throw new ArgumentException("Group cannot belong to both an Entity and a parent Group.");

        var group = new Group
        {
            Name = dto.Name,
            Description = dto.Description,
            EntityId = dto.EntityId,
            ParentGroupId = dto.ParentGroupId
        };

        var created = await _groups.AddAsync(group);
        return ToDto(created);
    }

    public async Task<GroupDto?> UpdateAsync(Guid id, UpdateGroupDto dto)
    {
        var group = await _groups.GetByIdAsync(id);
        if (group is null) return null;

        if (dto.Name != null) group.Name = dto.Name;
        if (dto.Description != null) group.Description = dto.Description;
        if (dto.EntityId.HasValue) group.EntityId = dto.EntityId.Value;
        if (dto.ParentGroupId.HasValue) group.ParentGroupId = dto.ParentGroupId.Value;

        var updated = await _groups.UpdateAsync(group);
        return ToDto(updated);
    }

public async Task<bool> DeleteAsync(Guid id)
{
    var group = await _groups.GetByIdAsync(id);
    if (group is null) return false;

    // Delete child groups recursively first
    foreach (var childGroup in group.ChildGroups.ToList())
        await DeleteAsync(childGroup.Id);

    // Delete child boxes
    foreach (var box in group.Boxes.ToList())
        await _boxCommand.DeleteAsync(box.Id);

    // Now safe to delete the group itself
    await _groups.DeleteAsync(id);
    return true;
}

    private static GroupDto ToDto(Group g) => new(
        g.Id,
        g.Name,
        g.Description,
        g.EntityId,
        g.ParentGroupId,
        g.ChildGroups.Select(c => c.Name),
        g.Boxes.Select(b => b.Name)
    );
}