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
