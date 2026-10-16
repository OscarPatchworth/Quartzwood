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
        Guid entityId;
        if (dto.ParentGroupId is not null)
        {
            // Nested group: always owned by the same Entity as its parent
            var parent = await _groups.GetByIdAsync(dto.ParentGroupId.Value)
                ?? throw new ArgumentException("Parent group not found.");

            if (dto.EntityId is not null && dto.EntityId != parent.EntityId)
                throw new ArgumentException("A nested group must belong to the same Entity as its parent.");

            entityId = parent.EntityId;
        }
        else
        {
            // Root group: needs an Entity to belong to
            entityId = dto.EntityId
                ?? throw new ArgumentException("Group must belong to either an Entity or a parent Group.");
        }

        var group = new Group
        {
            Name = dto.Name,
            Description = dto.Description,
            EntityId = entityId,
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
        if (dto.ParentGroupId.HasValue && dto.ParentGroupId != group.ParentGroupId)
        {
            var parent = await _groups.GetByIdAsync(dto.ParentGroupId.Value)
                ?? throw new ArgumentException("Parent group not found.");

            // Moving between Entities would mean re-stamping EntityId on the whole subtree: not supported yet
            if (parent.EntityId != group.EntityId)
                throw new ArgumentException("Groups can't be moved to a different Entity.");

            group.ParentGroupId = parent.Id;
        }

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