namespace Quartzwood.Server.DTOs;

public record BoxDto(
    Guid Id,
    string Name,
    Guid GroupId,
    int CardCount,
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

public record AddBoxDto(
    string Name,
    Guid GroupId
);

public record UpdateBoxDto(
    string? Name,
    Guid? GroupId
);

// A box you can put cards into, with where it is: for the "move to..." search
public record BoxSearchResultDto(
    Guid Id,
    string Name,
    Guid EntityId,
    string EntityName,
    // true = an Entity you own (e.g. your personal collection); false = one you're a member of
    bool IsOwned,
    // Root group first, the box's own group last
    List<LocationStepDto> GroupPath
);
