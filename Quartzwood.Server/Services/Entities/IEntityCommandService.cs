using Quartzwood.Server.DTOs;

namespace Quartzwood.Server.Services.Entities;

// Entities are created by AccountService.RegisterAsync (with their Owner membership and root group)
public interface IEntityCommandService
{
    Task<EntityDto?> UpdateAsync(Guid id, UpdateEntityDto dto);
}
