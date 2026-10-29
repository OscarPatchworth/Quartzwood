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
        // Always a nested group (root groups are only created with their Entity), owned by the parent's Entity
        var parent = await _groups.GetByIdAsync(dto.ParentGroupId)
            ?? throw new ArgumentException("Parent group not found.");

        var group = new Group
        {
            Name = dto.Name,
            Description = dto.Description,
            EntityId = parent.EntityId,
            ParentGroupId = parent.Id
        };

        var created = await _groups.AddAsync(group);
        return ToDto(created);
    }

    // null = same as the parent group. Children still on "same as parent" follow it automatically
    public async Task<bool> SetVisibilityAsync(Guid id, Visibility? visibility)
    {
        var group = await _groups.GetByIdAsync(id);
        if (group is null) return false;
        group.Visibility = visibility;
        await _groups.UpdateAsync(group);
        return true;
    }

    public async Task<GroupDto?> UpdateAsync(Guid id, UpdateGroupDto dto)
    {
        var group = await _groups.GetByIdAsync(id);
        if (group is null) return null;

        var isRoot = group.ParentGroupId is null;

        if (dto.Name != null && dto.Name != group.Name)
        {
            if (isRoot) throw new ArgumentException("Your collection can't be renamed.");
            group.Name = dto.Name;
        }
        if (dto.Description != null) group.Description = dto.Description;
        if (dto.ParentGroupId.HasValue && dto.ParentGroupId != group.ParentGroupId)
        {
            if (isRoot) throw new ArgumentException("Your collection can't be moved.");

            var parent = await _groups.GetByIdAsync(dto.ParentGroupId.Value)
                ?? throw new ArgumentException("Parent group not found.");

            // Moving between Entities would mean re-stamping EntityId on the whole subtree: not supported yet
            if (parent.EntityId != group.EntityId)
                throw new ArgumentException("Groups can't be moved to a different Entity.");

            // Walk up from the new parent: if we reach this group, the move would create a loop
            for (var ancestor = parent; ancestor is not null;
                 ancestor = ancestor.ParentGroupId is null ? null : await _groups.GetByIdAsync(ancestor.ParentGroupId.Value))
            {
                if (ancestor.Id == group.Id)
                    throw new ArgumentException("A group can't be moved inside itself.");
            }

            group.ParentGroupId = parent.Id;
        }

        var updated = await _groups.UpdateAsync(group);
        return ToDto(updated);
    }

public async Task<bool> DeleteAsync(Guid id)
{
    var group = await _groups.GetByIdAsync(id);
    if (group is null) return false;

    // The root only goes away with its Entity
    if (group.ParentGroupId is null)
        throw new ArgumentException("Your collection can't be deleted.");

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
        g.Boxes.Select(b => b.Name),
        Visibility: g.Visibility?.ToString()
    );
}