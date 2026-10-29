using Quartzwood.Server.DTOs;
using Quartzwood.Server.Models;

namespace Quartzwood.Server.Services.Boxs;

public interface IBoxCommandService
{
    Task<BoxDto> AddAsync(AddBoxDto dto);
    Task<BoxDto?> UpdateAsync(Guid id, UpdateBoxDto dto);
    Task<bool> DeleteAsync(Guid id);
    // false = no such box
    Task<bool> SetVisibilityAsync(Guid id, Visibility? visibility);
}