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

// Root group: pass EntityId. Nested group: pass ParentGroupId (EntityId is copied from the parent)
public record AddGroupDto(
    string Name,
    string? Description = null,
    Guid? EntityId = null,
    Guid? ParentGroupId = null
);

// EntityId isn't updatable: it always follows the group's place in the tree
public record UpdateGroupDto(
    string? Name,
    string? Description,
    Guid? ParentGroupId
);
