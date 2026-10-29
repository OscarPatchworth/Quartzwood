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

    // The user making the current request. A logged-out visitor (on the endpoints that allow them) gets
    // Guid.Empty, which is a member of nothing, so every membership check below is simply false for them
    private Guid UserId
    {
        get
        {
            var user = (_http.HttpContext ?? throw new InvalidOperationException("No HTTP request in progress.")).User;
            return user.Identity?.IsAuthenticated == true ? user.GetUserId() : Guid.Empty;
        }
    }

    // ---------- Viewing: members, or anyone when it isn't Private (see Visibility) ----------

    public async Task<Visibility> GetGroupVisibilityAsync(Guid groupId)
    {
        // Walk up until a group has its own setting. The depth limit is a safety net: moves already reject loops
        Guid? id = groupId;
        for (var depth = 0; id is not null && depth < 100; depth++)
        {
            var step = await _context.Groups
                .Where(g => g.Id == id)
                .Select(g => new { g.Visibility, g.ParentGroupId })
                .FirstOrDefaultAsync();
            if (step is null) break;
            if (step.Visibility is { } own) return own;
            id = step.ParentGroupId;
        }
        return Visibility.Private;
    }

    public async Task<Visibility> GetBoxVisibilityAsync(Guid boxId)
    {
        var box = await _context.Boxes
            .Where(b => b.Id == boxId)
            .Select(b => new { b.Visibility, b.GroupId })
            .FirstOrDefaultAsync();
        if (box is null) return Visibility.Private;
        return box.Visibility ?? await GetGroupVisibilityAsync(box.GroupId);
    }

    public async Task<bool> CanViewGroupAsync(Guid groupId)
        => await CanAccessGroupAsync(groupId) || await GetGroupVisibilityAsync(groupId) != Visibility.Private;

    public async Task<bool> CanViewBoxAsync(Guid boxId)
        => await CanAccessBoxAsync(boxId) || await GetBoxVisibilityAsync(boxId) != Visibility.Private;

    public async Task<bool> CanViewCardAsync(Guid cardId)
    {
        var boxId = await _context.Cards.Where(c => c.Id == cardId).Select(c => (Guid?)c.BoxId).FirstOrDefaultAsync();
        return boxId is not null && await CanViewBoxAsync(boxId.Value);
    }

    // ---------- Editing: members of the owning Entity ----------

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

    public Task<bool> CanAccessDividerAsync(Guid dividerId)
    {
        var userId = UserId;
        return _context.Dividers
            .AnyAsync(d => d.Id == dividerId
                && _context.EntityMembers.Any(m => m.EntityId == d.Box.Group.EntityId && m.UserId == userId));
    }

    public Task<bool> CanAccessCardAsync(Guid cardId)
    {
        var userId = UserId;
        return _context.Cards
            .AnyAsync(c => c.Id == cardId
                && _context.EntityMembers.Any(m => m.EntityId == c.Box.Group.EntityId && m.UserId == userId));
    }

    // Counts how many of the ids are accessible cards: if that's all of them, every one is yours.
    // One query however many ids: WHERE Id IN (@ids1, @ids2, ...). SQLite allows up to 32766 parameters,
    // well above the 5000-card cap on mass actions
    public async Task<bool> CanAccessCardsAsync(IReadOnlyCollection<Guid> cardIds)
    {
        var userId = UserId;
        var accessible = await _context.Cards
            .CountAsync(c => cardIds.Contains(c.Id)
                && _context.EntityMembers.Any(m => m.EntityId == c.Box.Group.EntityId && m.UserId == userId));
        return accessible == cardIds.Count;
    }

    public Task<bool> IsEntityOwnerAsync(Guid entityId)
    {
        var userId = UserId;
        return _context.EntityMembers
            .AnyAsync(m => m.EntityId == entityId && m.UserId == userId && m.Role == EntityRole.Owner);
    }

    public Task<bool> IsGroupOwnerAsync(Guid groupId)
    {
        var userId = UserId;
        return _context.Groups
            .AnyAsync(g => g.Id == groupId
                && _context.EntityMembers.Any(m => m.EntityId == g.EntityId && m.UserId == userId && m.Role == EntityRole.Owner));
    }

    public Task<List<Guid>> GetEntityIdsAsync()
    {
        var userId = UserId;
        return _context.EntityMembers
            .Where(m => m.UserId == userId)
            .Select(m => m.EntityId)
            .ToListAsync();
    }

    public Task<Dictionary<Guid, EntityRole>> GetEntityRolesAsync()
    {
        var userId = UserId;
        return _context.EntityMembers
            .Where(m => m.UserId == userId)
            .ToDictionaryAsync(m => m.EntityId, m => m.Role);
    }
}
