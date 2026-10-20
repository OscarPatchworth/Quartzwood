using Quartzwood.Server.Models;

namespace Quartzwood.Server.Repositories;

public interface ICardRepository
{
    Task<CardInstance?> GetByIdAsync(Guid id);
    Task<IEnumerable<CardInstance>> GetAllAsync();
    Task<IEnumerable<CardInstance>> GetByBoxAsync(Guid boxId);
    // Cards in the given Entities whose name contains the text, or whose set code is it (empty text = all). Includes Box
    Task<List<CardInstance>> SearchAsync(IReadOnlyCollection<Guid> entityIds, string text, int take);
    Task AddRangeAsync(IEnumerable<CardInstance> cards);
    Task<CardInstance> UpdateAsync(CardInstance card);
    Task DeleteAsync(Guid id);

    // Mass actions: each is ONE SQL statement for all the cards, returning how many rows changed
    Task<int> UpdateManyAsync(IReadOnlyCollection<Guid> ids, CardChanges changes);
    Task<int> MoveManyAsync(IReadOnlyCollection<Guid> ids, Guid boxId);
    Task<int> DeleteManyAsync(IReadOnlyCollection<Guid> ids);
}

// The fields a mass edit may set; null = leave as is
public record CardChanges(
    Condition? Condition,
    FoilType? FoilType,
    string? Language,
    bool? IsProxy,
    bool? IsSigned
);