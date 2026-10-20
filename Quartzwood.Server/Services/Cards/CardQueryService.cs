using Quartzwood.Server.DTOs;
using Quartzwood.Server.Models;
using Quartzwood.Server.Repositories;
using Quartzwood.Server.Services.Groups;
using Quartzwood.Server.Services.Scryfall;
using Quartzwood.Server.Services.Tags;

namespace Quartzwood.Server.Services.Cards;

public class CardQueryService : ICardQueryService
{
    // Most rows (stacks of identical cards) one search returns: enough to browse
    private const int SearchLimit = 200;
    // Most cards one search loads to filter and sort: enough for a large collection to be searched by
    // filters alone (no text), ~0.2s. A search matching more than this should be narrowed
    private const int SearchLoadLimit = 20000;

    private readonly ICardRepository _cards;
    private readonly IGroupRepository _groups;
    private readonly IScryfallService _scryfall;

    public CardQueryService(ICardRepository cards, IGroupRepository groups, IScryfallService scryfall)
    {
        _cards = cards;
        _groups = groups;
        _scryfall = scryfall;
    }

    // Empty text = every card (only allowed with a filter: the controller checks)
    public async Task<CardSearchResponseDto> SearchAsync(IReadOnlyCollection<Guid> entityIds, string text,
        CardListOptions options)
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
                Tags = TagNames.Key(c),
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
                    paths.PathTo(box.GroupId),
                    TagNames.Of(g.First())
                );
                return new CardStack<CardSearchResultDto>(row, g.Key.Name, g.Key.SetCode, g.Key.SetNumber,
                    g.Key.ScryfallId, g.Key.FoilType, g.Max(c => c.AddedAt), row.Tags);
            })
            // Location order first: the sort below is stable, so equal cards stay in this order (by box)
            .OrderBy(s => string.Join("/", s.Row.GroupPath.Select(step => step.Name)) + "/" + s.Row.BoxName)
            .ToList();

        var sorted = await FilterAndSortAsync(stacks, options);

        var hasMore = tooManyToLoad || sorted.Count > SearchLimit;
        return new CardSearchResponseDto(sorted.Take(SearchLimit).ToList(), hasMore);
    }

    // With its price (one scryfall.db lookup), for the card details panel
    public async Task<CardDto?> GetByIdAsync(Guid id)
    {
        var card = await _cards.GetByIdAsync(id);
        if (card is null) return null;

        var printing = card.ScryfallId is { } scryfallId
            ? (await _scryfall.GetGameplayByIdsAsync([scryfallId])).GetValueOrDefault(scryfallId)
            : null;
        return ToDto(card) with { Price = CardPrice.For(printing, card.FoilType) };
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
        TagNames.Of(c)
    );

    public async Task<IEnumerable<GroupedCardDto>> GetByBoxGroupedAsync(Guid boxId, CardListOptions options)
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
                // Tagging 1 of 4 Sol Rings "Trade" splits it into its own stack, so the tag is visible
                Tags = TagNames.Key(c),
            })
            .Select(g => new CardStack<GroupedCardDto>(
                new GroupedCardDto(
                    g.Key.Name,
                    g.Key.SetCode,
                    g.Key.SetNumber,
                    g.Key.ScryfallId,
                    g.Key.Condition.ToString(),
                    g.Key.FoilType.ToString(),
                    g.Key.StampType.ToString(),
                    g.Count(),
                    g.Select(c => c.Id.ToString()).ToList(),
                    TagNames.Of(g.First())
                ),
                g.Key.Name, g.Key.SetCode, g.Key.SetNumber, g.Key.ScryfallId, g.Key.FoilType,
                g.Max(c => c.AddedAt), TagNames.Of(g.First())
            ))
            .ToList();

        return await FilterAndSortAsync(stacks, options);
    }

    // One row of a card list (TRow: what the endpoint returns) plus what filtering/sorting needs to know about it.
    // AddedAt is the stack's newest copy's: adding another copy brings it back to the top
    private record CardStack<TRow>(TRow Row, string? Name, string? SetCode, string? SetNumber,
        string? ScryfallId, FoilType FoilType, DateTime? AddedAt, IReadOnlyList<string> Tags);

    // Looks up every stack's printing in scryfall.db in ONE batched query, drops the stacks the filter
    // rules out, then sorts the rest with CardSorting's rules
    private async Task<List<TRow>> FilterAndSortAsync<TRow>(List<CardStack<TRow>> stacks, CardListOptions options)
    {
        // No filter + sorting by name or added date: nothing needed from scryfall.db, skip the lookup
        var gameplay = options.NeedsGameplay
            ? await _scryfall.GetGameplayByIdsAsync(stacks.Select(s => s.ScryfallId).OfType<string>())
            : [];

        // Each stack's printing data and price, worked out once
        var withData = stacks.Select(stack =>
        {
            var printing = stack.ScryfallId is { } id ? gameplay.GetValueOrDefault(id) : null;
            return (Stack: stack, Printing: printing, Price: CardPrice.For(printing, stack.FoilType));
        });

        var sorted = CardSorting.Sort(withData.Where(x => options.Matches(x.Printing, x.Price, x.Stack.Tags)),
            x => new CardSortFields(x.Stack.Name, x.Stack.AddedAt, x.Stack.SetCode, x.Stack.SetNumber, x.Printing, x.Price),
            options.Sort, options.Descending);
        return sorted.Select(x => x.Stack.Row).ToList();
    }
}
