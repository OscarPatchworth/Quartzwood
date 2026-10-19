using Quartzwood.Server.DTOs;
using Quartzwood.Server.Models;

namespace Quartzwood.Server.Services.Boxs;

public interface IBoxQueryService
{
    Task<BoxDto?> GetByIdAsync(Guid id);
    Task<IEnumerable<BoxDto>> GetAllAsync();
    Task<IEnumerable<BoxDto>> GetByGroupAsync(Guid groupId);
    // Boxes in the given Entities whose name (or any group above them) contains the text;
    // empty text = all of them. Entities you own come first
    Task<List<BoxSearchResultDto>> SearchAsync(IReadOnlyDictionary<Guid, EntityRole> entityRoles, string text);
}