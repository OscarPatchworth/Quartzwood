using Quartzwood.Server.DTOs;

namespace Quartzwood.Server.Services.Dividers;

public interface IDividerService
{
    // Front of the box first
    Task<List<DividerDto>> GetByBoxAsync(Guid boxId);
    Task<DividerDto> AddAsync(AddDividerDto dto);
    Task<DividerDto?> RenameAsync(Guid id, string name);
    // dividerIds must be exactly the box's dividers, each once; returns them in the new order
    Task<List<DividerDto>> ReorderAsync(Guid boxId, IReadOnlyList<Guid> dividerIds);
    // Its cards stay in the box, behind no divider
    Task<bool> DeleteAsync(Guid id);
}
