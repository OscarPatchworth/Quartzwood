using Quartzwood.Server.DTOs;

namespace Quartzwood.Server.Services.Cards;

public interface ICardQueryService
{
    Task<CardDto?> GetByIdAsync(Guid id);
    Task<IEnumerable<CardDto>> GetAllAsync();
    Task<IEnumerable<CardDto>> GetByBoxAsync(Guid boxId);
    // Stacks of identical cards, filtered and sorted (see CardListOptions, CardSorting)
    Task<IEnumerable<GroupedCardDto>> GetByBoxGroupedAsync(Guid boxId, CardListOptions options);
    // limit: most rows to return (default 200)
    Task<CardSearchResponseDto> SearchAsync(IReadOnlyCollection<Guid> entityIds, string text, CardListOptions options,
        int? limit = null);
}