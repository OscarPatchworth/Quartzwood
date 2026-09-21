using Quartzwood.Server.DTOs;
using Quartzwood.Server.Models;
using Quartzwood.Server.Repositories;

namespace Quartzwood.Server.Services.Cards;

public class CardQueryService : ICardQueryService
{
    private readonly ICardRepository _cards;

    public CardQueryService(ICardRepository cards)
    {
        _cards = cards;
    }

    public async Task<CardDto?> GetByIdAsync(Guid id)
    {
        var card = await _cards.GetByIdAsync(id);
        return card is null ? null : ToDto(card);
    }

    public async Task<IEnumerable<CardDto>> GetAllAsync()
    {
        var cards = await _cards.GetAllAsync();
        return cards.Select(ToDto);
    }

    public async Task<IEnumerable<CardDto>> GetByBoxAsync(Guid boxId)
    {
        var cards = await _cards.GetByBoxAsync(boxId);
        return cards.Select(ToDto);
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

    public async Task<IEnumerable<GroupedCardDto>> GetByBoxGroupedAsync(Guid boxId)
{
    var cards = await _cards.GetByBoxAsync(boxId);

    return cards
        .GroupBy(c => new {
            c.Name,
            c.SetCode,
            c.SetNumber,
            c.ScryfallId,
            c.Condition,
            c.FoilType,
            c.StampType,
            c.Notes,
        })
        .Select(g => new GroupedCardDto(
            g.Key.Name,
            g.Key.SetCode,
            g.Key.SetNumber,
            g.Key.ScryfallId,
            g.Key.Condition.ToString(),
            g.Key.FoilType.ToString(),
            g.Key.StampType.ToString(),
            g.Count(),
            g.Select(c => c.Id.ToString()).ToList()
        ));
}
}