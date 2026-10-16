using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Quartzwood.Server.Data;
using Quartzwood.Server.DTOs;
using Quartzwood.Server.Models;
using Quartzwood.Server.Repositories;

namespace Quartzwood.Server.Services.Accounts;

public class AccountService : IAccountService
{
    private readonly UserManager<AppUser> _users;
    private readonly IEntityRepository _entities;
    private readonly AppDbContext _context;

    public AccountService(UserManager<AppUser> users, IEntityRepository entities, AppDbContext context)
    {
        _users = users;
        _entities = entities;
        _context = context;
    }

    public async Task<(IdentityResult Result, AccountDto? Account)> RegisterAsync(RegisterDto dto)
    {
        var displayName = dto.DisplayName.Trim();
        if (string.IsNullOrEmpty(displayName))
        {
            return (IdentityResult.Failed(new IdentityError
            {
                Code = "DisplayNameRequired",
                Description = "Display name is required."
            }), null);
        }

        // UserManager and the repository share this scoped DbContext, so one transaction covers both.
        // If anything below fails, the user is not left behind without a Personal entity.
        await using var transaction = await _context.Database.BeginTransactionAsync();

        var user = new AppUser
        {
            UserName = dto.Email,
            Email = dto.Email,
            DisplayName = displayName
        };

        // Validates email/password rules, hashes the password and saves the user
        var result = await _users.CreateAsync(user, dto.Password);
        if (!result.Succeeded) return (result, null);

        var personal = new Entity
        {
            Name = displayName,
            Type = EntityType.Personal
        };
        personal.Members.Add(new EntityMember { UserId = user.Id, Role = EntityRole.Owner });

        // Saves the entity and its membership row together
        await _entities.AddAsync(personal);

        await transaction.CommitAsync();

        return (result, new AccountDto(user.Id, dto.Email, user.DisplayName, personal.Id));
    }

    public async Task<AccountDto?> GetByIdAsync(Guid userId)
    {
        var user = await _users.FindByIdAsync(userId.ToString());
        if (user is null) return null;

        // The Personal entity is the one this user Owns with Type = Personal
        var personalEntityId = await _context.EntityMembers
            .Where(m => m.UserId == userId
                && m.Role == EntityRole.Owner
                && m.Entity.Type == EntityType.Personal)
            .Select(m => m.EntityId)
            .FirstOrDefaultAsync();

        return new AccountDto(user.Id, user.Email ?? string.Empty, user.DisplayName, personalEntityId);
    }
}
