namespace Quartzwood.Server.DTOs;

public record GroupDto(
    Guid Id,
    string Name,
    string? Description,
    Guid EntityId,
    Guid? ParentGroupId,
    IEnumerable<string> ChildGroupNames,
    IEnumerable<string> BoxNames,
    // Its own setting: "Private", "Unlisted", "Public", or null = same as the group it's in
    string? Visibility = null,
    // What null means here: the parent group's effective visibility ("Private" for a root group)
    string InheritedVisibility = "Private",
    // Visibility ?? InheritedVisibility: who can actually see it
    string EffectiveVisibility = "Private",
    // You're a member of the Entity that owns it; false = viewing an Unlisted/Public one
    bool CanEdit = false,
    // Only the Entity's owner can change who can see it
    bool CanChangeVisibility = false
);

// Users can only create nested groups: root groups are created with the Entity.
// EntityId is copied from the parent
public record AddGroupDto(
    string Name,
    Guid ParentGroupId,
    string? Description = null
);

// "Private", "Unlisted", "Public", or null = same as the group it's in
public record SetVisibilityDto(string? Visibility);

// EntityId isn't updatable: it always follows the group's place in the tree
public record UpdateGroupDto(
    string? Name,
    string? Description,
    Guid? ParentGroupId
);
