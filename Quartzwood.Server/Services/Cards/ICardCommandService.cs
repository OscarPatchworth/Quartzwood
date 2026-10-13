using Quartzwood.Server.DTOs;

namespace Quartzwood.Server.Services.Cards;

public interface ICardCommandService
{
    Task<CardDto?> AddAsync(AddCardDto dto);
    Task<CardDto?> UpdateAsync(Guid id, UpdateCardDto dto);
    Task<bool> DeleteAsync(Guid id);
}