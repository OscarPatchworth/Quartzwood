namespace Quartzwood.Server.DTOs;

public record GroupDto(
    Guid Id,
    string Name,
    string? Description,
    Guid EntityId,
    Guid? ParentGroupId,
    IEnumerable<string> ChildGroupNames,
    IEnumerable<string> BoxNames
);

// Users can only create nested groups: root groups are created with the Entity.
// EntityId is copied from the parent
public record AddGroupDto(
    string Name,
    Guid ParentGroupId,
    string? Description = null
);

// EntityId isn't updatable: it always follows the group's place in the tree
public record UpdateGroupDto(
    string? Name,
    string? Description,
    Guid? ParentGroupId
);
