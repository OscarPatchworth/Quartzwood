namespace Quartzwood.Server.DTOs;

public record AccountDto(
    Guid Id,
    string Email,
    string DisplayName,
    Guid PersonalEntityId,
    // The Personal entity's root group: the "My Collection" page
    Guid RootGroupId
);

public record RegisterDto(
    string Email,
    string Password,
    string DisplayName
);
