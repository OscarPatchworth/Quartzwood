using Microsoft.AspNetCore.Identity;
using Quartzwood.Server.DTOs;

namespace Quartzwood.Server.Services.Accounts;

public interface IAccountService
{
    // Account is null when Result has errors (bad password, email taken, ...)
    Task<(IdentityResult Result, AccountDto? Account)> RegisterAsync(RegisterDto dto);
    Task<AccountDto?> GetByIdAsync(Guid userId);
}
