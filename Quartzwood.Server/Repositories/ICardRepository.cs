using Quartzwood.Server.Models;

namespace Quartzwood.Server.Repositories;

public interface ICardRepository
{
    Task<CardInstance?> GetByIdAsync(Guid id);
    Task<IEnumerable<CardInstance>> GetAllAsync();
    Task<IEnumerable<CardInstance>> GetByBoxAsync(Guid boxId);
    // Cards in the given Entities whose name contains the text, or whose set code is it. Includes Box
    Task<List<CardInstance>> SearchAsync(IReadOnlyCollection<Guid> entityIds, string text, int take);
    Task<CardInstance> AddAsync(CardInstance card);
    Task<CardInstance> UpdateAsync(CardInstance card);
    Task DeleteAsync(Guid id);
}