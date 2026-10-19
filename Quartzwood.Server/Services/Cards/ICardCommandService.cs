using Quartzwood.Server.DTOs;

namespace Quartzwood.Server.Services.Cards;

public interface ICardCommandService
{
    // Adds dto.Quantity identical copies; null when the card isn't on Scryfall
    Task<List<CardDto>?> AddAsync(AddCardDto dto);
    Task<CardDto?> UpdateAsync(Guid id, UpdateCardDto dto);
    Task<bool> DeleteAsync(Guid id);
}