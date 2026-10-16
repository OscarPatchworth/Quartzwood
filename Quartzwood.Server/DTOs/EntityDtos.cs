namespace Quartzwood.Server.DTOs;

public record EntityDto(
    Guid Id,
    string Name,
    string Type,
    string? Location,
    IEnumerable<string> GroupNames
);

public record UpdateEntityDto(
    string? Name,
    string? Type,
    string? Location
);