using Quartzwood.Server.Models;

namespace Quartzwood.Server.Repositories;

public interface ICardRepository
{
    Task<CardInstance?> GetByIdAsync(Guid id);
    Task<IEnumerable<CardInstance>> GetAllAsync();
    Task<IEnumerable<CardInstance>> GetByBoxAsync(Guid boxId);
    // Cards in the given Entities whose name contains the text, or whose set code is it (empty text = all). Includes Box and Divider
    // boxId: only that box; groupIds: only boxes directly in those groups
    Task<List<CardInstance>> SearchAsync(IReadOnlyCollection<Guid> entityIds, string text, int take,
        Guid? boxId = null, IReadOnlyCollection<Guid>? groupIds = null);
    // Just the id and name of every named card in the given Entities: small rows, so matching a whole list of
    // names against a big collection stays fast
    Task<List<CardNameRow>> GetNamesByEntitiesAsync(IReadOnlyCollection<Guid> entityIds);
    // These cards, with their Box, Divider and tags (any number of ids)
    Task<List<CardInstance>> GetWithBoxByIdsAsync(IReadOnlyCollection<Guid> ids);
    Task AddRangeAsync(IEnumerable<CardInstance> cards);
    Task<CardInstance> UpdateAsync(CardInstance card);
    Task DeleteAsync(Guid id);

    // Mass actions: each is ONE SQL statement for all the cards, returning how many rows changed
    Task<int> UpdateManyAsync(IReadOnlyCollection<Guid> ids, CardChanges changes);
    Task<int> MoveManyAsync(IReadOnlyCollection<Guid> ids, Guid boxId, Guid? dividerId);
    Task<int> DeleteManyAsync(IReadOnlyCollection<Guid> ids);
}

public record CardNameRow(Guid Id, string Name);

// The fields a mass edit may set; null = leave as is
public record CardChanges(
    Condition? Condition,
    FoilType? FoilType,
    string? Language,
    bool? IsProxy,
    bool? IsSigned
);