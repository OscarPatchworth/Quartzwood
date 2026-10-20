using Quartzwood.Server.DTOs;

namespace Quartzwood.Server.Services.Cards;

public interface ICardCommandService
{
    // Adds dto.Quantity identical copies; null when the card isn't on Scryfall
    Task<List<CardDto>?> AddAsync(AddCardDto dto);
    Task<CardDto?> UpdateAsync(Guid id, UpdateCardDto dto);
    Task<bool> DeleteAsync(Guid id);

    // Mass actions on cards the caller has already checked access to; each returns how many changed
    Task<int> UpdateManyAsync(IReadOnlyCollection<Guid> ids, BulkUpdateCardsDto dto);
    // dividerId: behind that divider (one in the box); null = behind none
    Task<int> MoveManyAsync(IReadOnlyCollection<Guid> ids, Guid boxId, Guid? dividerId = null);
    Task<int> DeleteManyAsync(IReadOnlyCollection<Guid> ids);
    // Creates the box (groupId must exist) and moves the cards into it, all or nothing
    Task<BulkMoveToNewBoxResultDto> MoveToNewBoxAsync(IReadOnlyCollection<Guid> ids, string boxName, Guid groupId);
}