using Quartzwood.Server.Models;

namespace Quartzwood.Server.Services.Access;

// Answers "is the logged-in user a member of the Entity that owns this?"
public interface IAccessService
{
    // Viewing: a member, or anyone (even logged out) when its effective visibility isn't Private
    Task<Visibility> GetGroupVisibilityAsync(Guid groupId);
    Task<Visibility> GetBoxVisibilityAsync(Guid boxId);
    Task<bool> CanViewGroupAsync(Guid groupId);
    Task<bool> CanViewBoxAsync(Guid boxId);
    Task<bool> CanViewCardAsync(Guid cardId);

    // Editing (and the rest): a member of the Entity that owns it
    Task<bool> CanAccessEntityAsync(Guid entityId);
    Task<bool> CanAccessGroupAsync(Guid groupId);
    Task<bool> CanAccessBoxAsync(Guid boxId);
    Task<bool> CanAccessDividerAsync(Guid dividerId);
    Task<bool> CanAccessCardAsync(Guid cardId);
    // true only if EVERY id is a card you can access (ids must be distinct)
    Task<bool> CanAccessCardsAsync(IReadOnlyCollection<Guid> cardIds);

    Task<bool> IsEntityOwnerAsync(Guid entityId);
    // The owner of the Entity this group is in (who can change visibility)
    Task<bool> IsGroupOwnerAsync(Guid groupId);
    Task<List<Guid>> GetEntityIdsAsync();
    // Every Entity you're a member of, with your role in it
    Task<Dictionary<Guid, EntityRole>> GetEntityRolesAsync();
}
