using Quartzwood.Server.DTOs;

namespace Quartzwood.Server.Services.Cards;

public interface ICardQueryService
{
    Task<CardDto?> GetByIdAsync(Guid id);
    Task<IEnumerable<CardDto>> GetAllAsync();
    Task<IEnumerable<CardDto>> GetByBoxAsync(Guid boxId);
    // Stacks of identical cards, filtered and sorted (see CardListOptions, CardSorting)
    Task<IEnumerable<GroupedCardDto>> GetByBoxGroupedAsync(Guid boxId, CardListOptions options);
    // A whole list of cards at once (typed, pasted or a file's text: see CardListParser), with every copy of each
    Task<MassSearchResponseDto> MassSearchAsync(IReadOnlyCollection<Guid> entityIds, string text);
    // Which copies of a list's cards to take from which boxes, opening as few boxes as possible
    Task<FetchPlanDto> PlanFetchAsync(IReadOnlyCollection<Guid> entityIds, IReadOnlyList<WantedCard> cards);
    // limit: most rows to return (default 200)
    Task<CardSearchResponseDto> SearchAsync(IReadOnlyCollection<Guid> entityIds, string text, CardListOptions options,
        int? limit = null);
}