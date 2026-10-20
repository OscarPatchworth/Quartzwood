using Quartzwood.Server.DTOs;
using Quartzwood.Server.Models;
using Quartzwood.Server.Repositories;
using Quartzwood.Server.Services.Groups;
using Quartzwood.Server.Services.Scryfall;

namespace Quartzwood.Server.Services.Cards;

public class CardQueryService : ICardQueryService
{
    // Most rows (stacks of identical cards) one search returns: enough to browse
    private const int SearchLimit = 200;
    // Most cards one search loads to sort: a search matching more than this should be narrowed
    private const int SearchLoadLimit = 5000;

    private readonly ICardRepository _cards;
    private readonly IGroupRepository _groups;
    private readonly IScryfallService _scryfall;

    public CardQueryService(ICardRepository cards, IGroupRepository groups, IScryfallService scryfall)
    {
        _cards = cards;
        _groups = groups;
        _scryfall = scryfall;
    }

    public async Task<CardSearchResponseDto> SearchAsync(IReadOnlyCollection<Guid> entityIds, string text,
        CardSort sort, bool descending)
    {
        // Ask for one extra card: if it comes back, there are more matches than we load
        var cards = await _cards.SearchAsync(entityIds, text, SearchLoadLimit + 1);
        var tooManyToLoad = cards.Count > SearchLoadLimit;
        if (tooManyToLoad) cards = cards.Take(SearchLoadLimit).ToList();
        if (cards.Count == 0) return new CardSearchResponseDto([], false);

        // One query for every group in the user's Entities (usually tens of rows),
        // then each location path is built in memory
        var paths = new GroupPaths(await _groups.GetTreeByEntitiesAsync(entityIds));

        // Same grouping as the box page, plus the box: identical copies in one box = one row
        var stacks = cards
            .GroupBy(c => new {
                c.BoxId,
                c.Name,
                c.SetCode,
                c.SetNumber,
                c.ScryfallId,
                c.Condition,
                c.FoilType,
                c.StampType,
                c.Notes,
            })
            .Select(g =>
            {
                var box = g.First().Box;
                var row = new CardSearchResultDto(
                    g.Key.Name,
                    g.Key.SetCode,
                    g.Key.SetNumber,
                    g.Key.ScryfallId,
                    g.Key.Condition.ToString(),
                    g.Key.FoilType.ToString(),
                    g.Key.StampType.ToString(),
                    g.Count(),
                    g.Select(c => c.Id.ToString()).ToList(),
                    box.Id,
                    box.Name,
                    paths.PathTo(box.GroupId)
                );
                return (Row: row, AddedAt: g.Max(c => c.AddedAt));
            })
            // Location order first: the sort below is stable, so equal cards stay in this order (by box)
            .OrderBy(s => string.Join("/", s.Row.GroupPath.Select(step => step.Name)) + "/" + s.Row.BoxName)
            .ToList();

        var sorted = await SortAsync(stacks, s => s.Row.ScryfallId,
            (s, gameplay) => new CardSortFields(s.Row.Name, s.AddedAt, s.Row.SetCode, s.Row.SetNumber, gameplay),
            sort, descending);

        var hasMore = tooManyToLoad || sorted.Count > SearchLimit;
        return new CardSearchResponseDto(sorted.Take(SearchLimit).Select(s => s.Row).ToList(), hasMore);
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
        c.IsList,
        c.AlterArtist,
        c.Notes,
        c.BoxId,
        c.CardTags.Select(ct => ct.Tag.Name)
    );

    public async Task<IEnumerable<GroupedCardDto>> GetByBoxGroupedAsync(Guid boxId, CardSort sort, bool descending)
    {
        var cards = await _cards.GetByBoxAsync(boxId);

        var stacks = cards
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
            .Select(g => (
                Row: new GroupedCardDto(
                    g.Key.Name,
                    g.Key.SetCode,
                    g.Key.SetNumber,
                    g.Key.ScryfallId,
                    g.Key.Condition.ToString(),
                    g.Key.FoilType.ToString(),
                    g.Key.StampType.ToString(),
                    g.Count(),
                    g.Select(c => c.Id.ToString()).ToList()
                ),
                // A stack's "added" date is its newest copy's: adding another copy brings it back to the top
                AddedAt: g.Max(c => c.AddedAt)
            ))
            .ToList();

        var sorted = await SortAsync(stacks, s => s.Row.ScryfallId,
            (s, gameplay) => new CardSortFields(s.Row.Name, s.AddedAt, s.Row.SetCode, s.Row.SetNumber, gameplay),
            sort, descending);
        return sorted.Select(s => s.Row);
    }

    // Looks up every stack's printing in scryfall.db in ONE batched query, then sorts with CardSorting's rules
    private async Task<List<T>> SortAsync<T>(List<T> stacks, Func<T, string?> scryfallId,
        Func<T, ScryfallGameplay?, CardSortFields> fields, CardSort sort, bool descending)
    {
        // Sorting by name or added date doesn't need anything from scryfall.db: skip the lookup
        var needsGameplay = sort is CardSort.Printed or CardSort.ManaValue or CardSort.Color;
        var gameplay = needsGameplay
            ? await _scryfall.GetGameplayByIdsAsync(stacks.Select(scryfallId).OfType<string>())
            : [];

        return CardSorting.Sort(stacks,
            stack => fields(stack, scryfallId(stack) is { } id ? gameplay.GetValueOrDefault(id) : null),
            sort, descending);
    }
}
