using Quartzwood.Server.DTOs;
using Quartzwood.Server.Models;
using Quartzwood.Server.Repositories;
using Quartzwood.Server.Services.Scryfall;

namespace Quartzwood.Server.Services.Cards;

public class CardCommandService : ICardCommandService
{
    private readonly ICardRepository _cards;
    private readonly IBoxRepository _boxes;
    private readonly IScryfallService _scryfall;

    public CardCommandService(ICardRepository cards, IBoxRepository boxes, IScryfallService scryfall)
    {
        _cards = cards;
        _boxes = boxes;
        _scryfall = scryfall;
    }

    // Most copies one request may add: stops a typo like "10000 Sol Ring" filling the database
    private const int MaxQuantity = 1000;

    public async Task<List<CardDto>?> AddAsync(AddCardDto dto)
    {
        if (dto.Quantity is < 1 or > MaxQuantity)
            throw new ArgumentException($"Quantity must be between 1 and {MaxQuantity}.");

        // A missing boxId arrives as Guid.Empty, which would otherwise fail as a DB foreign key error (500)
        if (await _boxes.GetByIdAsync(dto.BoxId) is null)
            throw new ArgumentException("Box not found.");

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
            if (dto.IsList && dto.SetCode != "PLST")
            {
                dto = dto with { SetNumber = dto.SetCode + "-" + dto.SetNumber, SetCode = "PLST" };
            }
            var scryfallCard = await _scryfall.GetCardAsync(dto.SetCode, dto.SetNumber);
            if (scryfallCard is null) return null;

            name = scryfallCard.Name;
            scryfallId = scryfallCard.Id;
            nameSource = NameSource.Scryfall;
        }
        else if (dto.Name != null)
        {
            nameSource = NameSource.Manual;
        }

        // Everything above (validation + Scryfall lookup) ran once; now make the identical copies
        CardInstance NewCopy()
        {
            var card = new CardInstance
            {
                SetCode = dto.SetCode,
                SetNumber = dto.SetNumber,
                Name = name,
                NameSource = nameSource,
                ScryfallId = scryfallId,
                Condition = condition,
                FoilType = foilType,
                StampType = stampType,
                Language = dto.Language,
                IsProxy = dto.IsProxy,
                IsSigned = dto.IsSigned,
                IsList = dto.IsList,
                AlterArtist = dto.AlterArtist,
                Notes = dto.Notes,
                BoxId = dto.BoxId,
                AcquiredDate = dto.AcquiredDate,
                PurchasePrice = dto.PurchasePrice,
            };

            // List cards are stored under their original set: PLST "IKO-1" -> IKO #1
            if (dto.SetCode == "PLST" && dto.SetNumber != null && dto.SetNumber.Contains('-'))
            {
                var parsedSetCode = dto.SetNumber.Split("-", 2);
                card.SetCode = parsedSetCode[0];
                card.SetNumber = parsedSetCode[1];
                card.IsList = true;
            }

            return card;
        }

        var copies = Enumerable.Range(0, dto.Quantity).Select(_ => NewCopy()).ToList();
        await _cards.AddRangeAsync(copies);
        return copies.Select(ToDto).ToList();
    }

    public async Task<CardDto?> UpdateAsync(Guid id, UpdateCardDto dto)
    {
        //TODO: Check is valid card -> i.e. Can this be a Stamped Card ?
        // if (fasle):{Return -> not valid card update}
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
        //TODO: Only update image on List:bool IF bool has changed value
        if (dto.IsList.HasValue) {card.IsList = dto.IsList.Value; updateImage = true;}
        if (dto.AlterArtist != null) card.AlterArtist = dto.AlterArtist;
        if (dto.Notes != null) card.Notes = dto.Notes;
        if (dto.BoxId.HasValue && dto.BoxId != card.BoxId)
        {
            if (await _boxes.GetByIdAsync(dto.BoxId.Value) is null)
                throw new ArgumentException("Box not found.");
            card.BoxId = dto.BoxId.Value;
        }
        if (dto.AcquiredDate.HasValue) card.AcquiredDate = dto.AcquiredDate.Value;
        if (dto.PurchasePrice.HasValue) card.PurchasePrice = dto.PurchasePrice.Value;

        if(updateImage){
            card.ScryfallId = await _scryfall.GetScryfallId(
                card.SetCode, card.SetNumber, card.StampType.ToString(), card.IsList, card.Name
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
        c.IsList,
        c.AlterArtist,
        c.Notes,
        c.BoxId,
        c.CardTags.Select(ct => ct.Tag.Name)
    );
}