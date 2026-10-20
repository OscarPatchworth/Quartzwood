using Quartzwood.Server.Models;

namespace Quartzwood.Server.Services.Access;

// Answers "is the logged-in user a member of the Entity that owns this?"
public interface IAccessService
{
    Task<bool> CanAccessEntityAsync(Guid entityId);
    Task<bool> CanAccessGroupAsync(Guid groupId);
    Task<bool> CanAccessBoxAsync(Guid boxId);
    Task<bool> CanAccessDividerAsync(Guid dividerId);
    Task<bool> CanAccessCardAsync(Guid cardId);
    // true only if EVERY id is a card you can access (ids must be distinct)
    Task<bool> CanAccessCardsAsync(IReadOnlyCollection<Guid> cardIds);

    Task<bool> IsEntityOwnerAsync(Guid entityId);
    Task<List<Guid>> GetEntityIdsAsync();
    // Every Entity you're a member of, with your role in it
    Task<Dictionary<Guid, EntityRole>> GetEntityRolesAsync();
}
