namespace Quartzwood.Server.Services.Access;

// Answers "is the logged-in user a member of the Entity that owns this?"
public interface IAccessService
{
    Task<bool> CanAccessEntityAsync(Guid entityId);
    Task<bool> CanAccessGroupAsync(Guid groupId);
    Task<bool> CanAccessBoxAsync(Guid boxId);
    Task<bool> CanAccessCardAsync(Guid cardId);

    Task<bool> IsEntityOwnerAsync(Guid entityId);
    Task<List<Guid>> GetEntityIdsAsync();
}
