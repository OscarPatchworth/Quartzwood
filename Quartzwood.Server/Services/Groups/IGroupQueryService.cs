using Quartzwood.Server.DTOs;

namespace Quartzwood.Server.Services.Groups;

public interface IGroupQueryService
{
    // hidePrivate: leave out (and don't count) children set to Private, for viewers who aren't members
    Task<GroupDto?> GetByIdAsync(Guid id, bool hidePrivate = false);
    Task<IEnumerable<GroupDto>> GetAllAsync();
    Task<IEnumerable<GroupDto>> GetByEntityAsync(Guid entityId);
    Task<IEnumerable<GroupDto>> GetByParentGroupAsync(Guid parentGroupId, bool hidePrivate = false);
}