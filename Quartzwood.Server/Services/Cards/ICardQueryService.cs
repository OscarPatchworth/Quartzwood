using Quartzwood.Server.DTOs;

namespace Quartzwood.Server.Services.Cards;

public interface ICardQueryService
{
    Task<CardDto?> GetByIdAsync(Guid id);
    Task<IEnumerable<CardDto>> GetAllAsync();
    Task<IEnumerable<CardDto>> GetByBoxAsync(Guid boxId);
    // Stacks of identical cards, sorted (see CardSorting)
    Task<IEnumerable<GroupedCardDto>> GetByBoxGroupedAsync(Guid boxId, CardSort sort, bool descending);
    Task<CardSearchResponseDto> SearchAsync(IReadOnlyCollection<Guid> entityIds, string text, CardSort sort, bool descending);
}