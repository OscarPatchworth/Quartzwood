namespace Quartzwood.Server.DTOs;

public record AccountDto(
    Guid Id,
    string Email,
    string DisplayName,
    Guid PersonalEntityId
);

public record RegisterDto(
    string Email,
    string Password,
    string DisplayName
);
