using Quartzwood.Server.DTOs;
using Quartzwood.Server.Models;

namespace Quartzwood.Server.Services.Groups;

public interface IGroupCommandService
{
    Task<GroupDto> AddAsync(AddGroupDto dto);
    Task<GroupDto?> UpdateAsync(Guid id, UpdateGroupDto dto);
    Task<bool> DeleteAsync(Guid id);
    // false = no such group
    Task<bool> SetVisibilityAsync(Guid id, Visibility? visibility);
}