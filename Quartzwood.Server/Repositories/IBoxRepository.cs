using Quartzwood.Server.Models;

namespace Quartzwood.Server.Repositories;

public interface IBoxRepository
{
    Task<Box?> GetByIdAsync(Guid id);
    Task<IEnumerable<Box>> GetAllAsync();
    Task<IEnumerable<Box>> GetByGroupAsync(Guid groupId);
    Task<bool> ExistsAsync(Guid id);
    // Every box in the given Entities, with its Group and that Group's Entity (no cards): for box search
    Task<List<Box>> GetByEntitiesAsync(IReadOnlyCollection<Guid> entityIds);
    Task<Box> AddAsync(Box box);
    Task<Box> UpdateAsync(Box box);
    Task DeleteAsync(Guid id);
}