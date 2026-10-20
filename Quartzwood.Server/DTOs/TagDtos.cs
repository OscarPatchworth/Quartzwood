namespace Quartzwood.Server.DTOs;

public record TagDto(
    Guid Id,
    string Name
);

// Add and/or remove tags (by name) on one or many cards. Adding a name you've never used creates the tag
public record BulkTagsDto(
    List<Guid> CardIds,
    List<string>? Add,
    List<string>? Remove
);
