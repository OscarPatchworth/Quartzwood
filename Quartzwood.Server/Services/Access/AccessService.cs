using Microsoft.EntityFrameworkCore;
using Quartzwood.Server.Data;
using Quartzwood.Server.Extensions;
using Quartzwood.Server.Models;

namespace Quartzwood.Server.Services.Access;

// Each check is a single query: follow the foreign keys up to the owning Entity,
// then look for an EntityMembers row for (that Entity, current user)
public class AccessService : IAccessService
{
    private readonly AppDbContext _context;
    private readonly IHttpContextAccessor _http;

    public AccessService(AppDbContext context, IHttpContextAccessor http)
    {
        _context = context;
        _http = http;
    }

    // The user making the current request
    private Guid UserId => _http.HttpContext?.User.GetUserId()
        ?? throw new InvalidOperationException("No HTTP request in progress.");

    public Task<bool> CanAccessEntityAsync(Guid entityId)
    {
        var userId = UserId;
        return _context.EntityMembers
            .AnyAsync(m => m.EntityId == entityId && m.UserId == userId);
    }

    public Task<bool> CanAccessGroupAsync(Guid groupId)
    {
        var userId = UserId;
        return _context.Groups
            .AnyAsync(g => g.Id == groupId
                && _context.EntityMembers.Any(m => m.EntityId == g.EntityId && m.UserId == userId));
    }

    public Task<bool> CanAccessBoxAsync(Guid boxId)
    {
        var userId = UserId;
        return _context.Boxes
            .AnyAsync(b => b.Id == boxId
                && _context.EntityMembers.Any(m => m.EntityId == b.Group.EntityId && m.UserId == userId));
    }

    public Task<bool> CanAccessCardAsync(Guid cardId)
    {
        var userId = UserId;
        return _context.Cards
            .AnyAsync(c => c.Id == cardId
                && _context.EntityMembers.Any(m => m.EntityId == c.Box.Group.EntityId && m.UserId == userId));
    }

    public Task<bool> IsEntityOwnerAsync(Guid entityId)
    {
        var userId = UserId;
        return _context.EntityMembers
            .AnyAsync(m => m.EntityId == entityId && m.UserId == userId && m.Role == EntityRole.Owner);
    }

    public Task<List<Guid>> GetEntityIdsAsync()
    {
        var userId = UserId;
        return _context.EntityMembers
            .Where(m => m.UserId == userId)
            .Select(m => m.EntityId)
            .ToListAsync();
    }
}
