namespace Quartzwood.Server.DTOs;

public record BoxDto(
    Guid Id,
    string Name,
    Guid GroupId,
    int CardCount
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
