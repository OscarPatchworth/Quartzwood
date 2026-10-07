using Quartzwood.Server.DTOs;
using Quartzwood.Server.Models;
using Quartzwood.Server.Repositories;
using Quartzwood.Server.Services.Scryfall;

namespace Quartzwood.Server.Services.Cards;

public class CardCommandService : ICardCommandService
{
    private readonly ICardRepository _cards;
    private readonly IScryfallService _scryfall;

    public CardCommandService(ICardRepository cards, IScryfallService scryfall)
    {
        _cards = cards;
        _scryfall = scryfall;
    }

    public async Task<CardDto> AddAsync(AddCardDto dto)
    {
        if (!Enum.TryParse<Condition>(dto.Condition, true, out var condition))
            throw new ArgumentException($"Invalid condition: {dto.Condition}");
        if (!Enum.TryParse<FoilType>(dto.FoilType, true, out var foilType))
            throw new ArgumentException($"Invalid foil type: {dto.FoilType}");
        if (!Enum.TryParse<StampType>(dto.StampType, true, out var stampType))
            throw new ArgumentException($"Invalid stamp type: {dto.StampType}");

        // Scryfall lookup
        string? name = dto.Name;
        string? scryfallId = null;
        var nameSource = NameSource.Unknown;

        if (dto.SetCode != null && dto.SetNumber != null)
        {
            var scryfallCard = await _scryfall.GetCardAsync(dto.SetCode, dto.SetNumber);
            if (scryfallCard != null)
            {
                name = scryfallCard.Name;
                scryfallId = scryfallCard.Id;
                nameSource = NameSource.Scryfall;
            }
        }
        else if (dto.Name != null)
        {
            nameSource = NameSource.Manual;
        }
        var card = new CardInstance
        {
            SetCode = dto.SetCode,
            SetNumber = dto.SetNumber,
            Name = name,                  // ← local variable from Scryfall
            NameSource = nameSource,      // ← local variable from Scryfall
            ScryfallId = scryfallId,      
            Condition = condition,
            FoilType = foilType,
            StampType = stampType,
            Language = dto.Language,
            IsProxy = dto.IsProxy,
            IsSigned = dto.IsSigned,
            AlterArtist = dto.AlterArtist,
            Notes = dto.Notes,
            BoxId = dto.BoxId,
            AcquiredDate = dto.AcquiredDate,
            PurchasePrice = dto.PurchasePrice,
        };

        var created = await _cards.AddAsync(card);
        return ToDto(created);
    }

    public async Task<CardDto?> UpdateAsync(Guid id, UpdateCardDto dto)
    {
        var card = await _cards.GetByIdAsync(id);
        if (card is null) return null;

        var updateImage = false;

        if (dto.Condition != null && Enum.TryParse<Condition>(dto.Condition, true, out var condition))
            card.Condition = condition;
        if (dto.FoilType != null && Enum.TryParse<FoilType>(dto.FoilType, true, out var foilType))
            card.FoilType = foilType;
        if (dto.StampType != null && Enum.TryParse<StampType>(dto.StampType, true, out var stampType))
            {card.StampType = stampType;
            updateImage = true;}
        if (dto.SetCode != null) {card.SetCode = dto.SetCode; updateImage = true;}
        if (dto.SetNumber != null) {card.SetNumber = dto.SetNumber; updateImage = true;}
        if (dto.Name != null) { card.Name = dto.Name; card.NameSource = NameSource.Manual; }
        if (dto.Language != null) card.Language = dto.Language;
        if (dto.IsProxy.HasValue) card.IsProxy = dto.IsProxy.Value;
        if (dto.IsSigned.HasValue) card.IsSigned = dto.IsSigned.Value;
        if (dto.AlterArtist != null) card.AlterArtist = dto.AlterArtist;
        if (dto.Notes != null) card.Notes = dto.Notes;
        if (dto.BoxId.HasValue) card.BoxId = dto.BoxId.Value;
        if (dto.AcquiredDate.HasValue) card.AcquiredDate = dto.AcquiredDate.Value;
        if (dto.PurchasePrice.HasValue) card.PurchasePrice = dto.PurchasePrice.Value;

        if(updateImage){
            card.ScryfallId = await _scryfall.GetScryfallId(
                card.SetCode, card.SetNumber, card.StampType.ToString(), card.Name
            );
        }

        var updated = await _cards.UpdateAsync(card);
        return ToDto(updated);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var card = await _cards.GetByIdAsync(id);
        if (card is null) return false;
        await _cards.DeleteAsync(id);
        return true;
    }

    private static CardDto ToDto(CardInstance c) => new(
        c.Id,
        c.Name,
        c.SetCode,
        c.SetNumber,
        c.ScryfallId,
        c.Condition.ToString(),
        c.FoilType.ToString(),
        c.StampType.ToString(),
        c.Language,
        c.IsProxy,
        c.IsSigned,
        c.AlterArtist,
        c.Notes,
        c.BoxId,
        c.CardTags.Select(ct => ct.Tag.Name)
    );
}