using Quartzwood.Server.DTOs;
using Quartzwood.Server.Models;

namespace Quartzwood.Server.Services.Boxs;

public interface IBoxQueryService
{
    Task<BoxDto?> GetByIdAsync(Guid id);
    Task<IEnumerable<BoxDto>> GetAllAsync();
    // hidePrivate: leave out boxes set to Private, for viewers who aren't members
    Task<IEnumerable<BoxDto>> GetByGroupAsync(Guid groupId, bool hidePrivate = false);
    // Boxes in the given Entities whose name (or any group above them) contains the text;
    // empty text = all of them. Entities you own come first
    Task<List<BoxSearchResultDto>> SearchAsync(IReadOnlyDictionary<Guid, EntityRole> entityRoles, string text);
}