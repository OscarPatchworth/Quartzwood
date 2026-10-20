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

    // Empty text = every card (the search endpoint only allows that with a filter).
    // limit: most rows to return (default SearchLimit)
    public async Task<CardSearchResponseDto> SearchAsync(IReadOnlyCollection<Guid> entityIds, string text,
        CardListOptions options, int? limit = null)
    {
        // One query for every group in the user's Entities (usually tens of rows): location paths are built
        // from it in memory, and so is "this group and every group inside it" for the group filter
        var paths = new GroupPaths(await _groups.GetTreeByEntitiesAsync(entityIds));
        var groupIds = options.GroupId is { } groupId ? paths.WithDescendants(groupId) : null;

        // Ask for one extra card: if it comes back, there are more matches than we load
        var cards = await _cards.SearchAsync(entityIds, text, SearchLoadLimit + 1, options.BoxId, groupIds);
        var tooManyToLoad = cards.Count > SearchLoadLimit;
        if (tooManyToLoad) cards = cards.Take(SearchLoadLimit).ToList();
        if (cards.Count == 0) return new CardSearchResponseDto([], false);

        var stacks = ToSearchStacks(cards, paths);
        var sorted = await FilterAndSortAsync(stacks, options);

        var rowLimit = limit ?? SearchLimit;
        var hasMore = tooManyToLoad || sorted.Count > rowLimit;
        return new CardSearchResponseDto(
            sorted.Take(rowLimit).Select(x => x.Row with { Price = x.Price }).ToList(), hasMore);
    }

    // Same grouping as the box page, plus the box: identical copies in one box = one row, in location order
    private static List<CardStack<CardSearchResultDto>> ToSearchStacks(IEnumerable<CardInstance> cards, GroupPaths paths)
        => cards
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
            // Location order first: sorting after this is stable, so equal cards stay in this order (by box)
            .OrderBy(s => LocationKey(s.Row))
            .ToList();

    private static string LocationKey(CardSearchResultDto row)
        => string.Join("/", row.GroupPath.Select(step => step.Name)) + "/" + row.BoxName;

    // ---- Mass search: a whole list of cards at once ----

    public async Task<MassSearchResponseDto> MassSearchAsync(IReadOnlyCollection<Guid> entityIds, string text)
    {
        var list = CardListParser.Parse(text);
        var matches = await FindListAsync(entityIds, list.Cards);

        return new MassSearchResponseDto(
            list.Format,
            matches.Select(m => new MassSearchEntryDto(
                m.Name,
                m.Wanted,
                m.Stacks.Sum(s => s.Count),
                // The picture: one of your copies, else any printing of the card
                m.Stacks.Select(s => s.ScryfallId).FirstOrDefault(id => id != null) ?? m.Printing?.Id,
                m.Printing is not null,
                m.Stacks)).ToList(),
            list.Skipped.Select(s => new MassSearchSkippedLineDto(s.LineNumber, s.Text, s.Reason)).ToList());
    }

    // Which copies to take out of which boxes to collect the list, opening as few boxes as possible (FetchPlanner)
    public async Task<FetchPlanDto> PlanFetchAsync(IReadOnlyCollection<Guid> entityIds, IReadOnlyList<WantedCard> cards)
    {
        var matches = await FindListAsync(entityIds, cards);

        // Where each card's copies are: one supply per card per box
        var supplies = matches
            .SelectMany((match, index) => match.Stacks
                .GroupBy(stack => stack.BoxId)
                .Select(box => new FetchPlanner.Supply<CardSearchResultDto>(box.Key, index,
                    box.Select(stack => (stack, (IReadOnlyList<string>)stack.Ids)).ToList())))
            .ToList();
        var boxes = matches.SelectMany(m => m.Stacks)
            .GroupBy(stack => stack.BoxId)
            .ToDictionary(g => g.Key, g => g.First());
        var boxOrder = boxes.Values.OrderBy(LocationKey).Select(stack => stack.BoxId).ToList();

        var (plan, found) = FetchPlanner.Plan(matches.Select(m => m.Wanted).ToList(), supplies, boxOrder);

        return new FetchPlanDto(
            plan.Select(box => new FetchPlanBoxDto(
                box.BoxId,
                boxes[box.BoxId].BoxName,
                boxes[box.BoxId].GroupPath,
                box.Take.Select(pick => pick.Stack with { Count = pick.Ids.Count, Ids = pick.Ids }).ToList())).ToList(),
            matches
                .Select((m, index) => new FetchShortDto(m.Name, m.Wanted, found[index]))
                .Where(s => s.Found < s.Wanted)
                .ToList(),
            found.Sum());
    }

    // One card of a list: the card it turned out to be on Scryfall (null = no such card), and your copies of it
    private record ListMatch(string Name, int Wanted, ScryfallCard? Printing, List<CardSearchResultDto> Stacks);

    // Finds your copies of every card in a list. Names match the way CardNames describes ("lim-dul's vault",
    // or a double-faced card by its front face). Lines that turn out to be the same card are merged
    private async Task<List<ListMatch>> FindListAsync(IReadOnlyCollection<Guid> entityIds, IReadOnlyList<WantedCard> list)
    {
        var known = await _scryfall.FindByNamesAsync(list.Select(w => w.Name));

        // Each entry under every name it answers to: as typed, and Scryfall's full name
        var entries = new List<(string Name, int Wanted, ScryfallCard? Printing)>();
        var entryByKey = new Dictionary<string, int>();
        foreach (var wanted in list)
        {
            var typedKey = CardNames.Normalise(wanted.Name);
            var printing = known.GetValueOrDefault(typedKey);
            var fullKey = printing is null ? typedKey : CardNames.Normalise(printing.Name);

            if (entryByKey.TryGetValue(fullKey, out var existing) || entryByKey.TryGetValue(typedKey, out existing))
            {
                var entry = entries[existing];
                entries[existing] = entry with { Wanted = Math.Min(entry.Wanted + wanted.Quantity, CardListParser.MaxQuantity) };
            }
            else
            {
                existing = entries.Count;
                entries.Add((printing?.Name ?? wanted.Name.Trim(), wanted.Quantity, printing));
            }
            entryByKey.TryAdd(typedKey, existing);
            entryByKey.TryAdd(fullKey, existing);
        }

        // Every card name in the collection (small rows), matched in memory. A card belongs to ONE entry:
        // its full name's, else its first face's (a list with both "Fire" and "Ice" can't count one card twice)
        var entryOfCard = new Dictionary<Guid, int>();
        foreach (var card in await _cards.GetNamesByEntitiesAsync(entityIds))
        {
            foreach (var key in CardNames.Keys(card.Name))
            {
                if (!entryByKey.TryGetValue(key, out var index)) continue;
                entryOfCard[card.Id] = index;
                break;
            }
        }

        var stacksByEntry = entries.Select(_ => new List<CardSearchResultDto>()).ToList();
        if (entryOfCard.Count > 0)
        {
            var paths = new GroupPaths(await _groups.GetTreeByEntitiesAsync(entityIds));
            var cards = await _cards.GetWithBoxByIdsAsync(entryOfCard.Keys);
            // Priced in one lookup; the name sort is stable, so each card's stacks stay in location order
            foreach (var (row, price) in await FilterAndSortAsync(ToSearchStacks(cards, paths), new CardListOptions()))
                stacksByEntry[entryOfCard[Guid.Parse(row.Ids[0])]].Add(row with { Price = price });
        }

        return entries.Select((e, index) => new ListMatch(e.Name, e.Wanted, e.Printing, stacksByEntry[index])).ToList();
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
        c.DividerId,
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

        return (await FilterAndSortAsync(stacks, options)).Select(x => x.Row with { Price = x.Price });
    }

    // One row of a card list (TRow: what the endpoint returns) plus what filtering/sorting needs to know about it.
    // AddedAt is the stack's newest copy's: adding another copy brings it back to the top
    private record CardStack<TRow>(TRow Row, string? Name, string? SetCode, string? SetNumber,
        string? ScryfallId, FoilType FoilType, DateTime? AddedAt, IReadOnlyList<string> Tags);

    // Looks up every stack's printing in scryfall.db in ONE batched query, drops the stacks the filter
    // rules out, then sorts the rest with CardSorting's rules. Returns each row with its price (rows show it)
    private async Task<List<(TRow Row, decimal? Price)>> FilterAndSortAsync<TRow>(List<CardStack<TRow>> stacks,
        CardListOptions options)
    {
        // Always looked up: every row shows its price (one primary-key query per 1000 printings)
        var gameplay = await _scryfall.GetGameplayByIdsAsync(stacks.Select(s => s.ScryfallId).OfType<string>());

        // Each stack's printing data and price, worked out once
        var withData = stacks.Select(stack =>
        {
            var printing = stack.ScryfallId is { } id ? gameplay.GetValueOrDefault(id) : null;
            return (Stack: stack, Printing: printing, Price: CardPrice.For(printing, stack.FoilType));
        });

        var sorted = CardSorting.Sort(withData.Where(x => options.Matches(x.Printing, x.Price, x.Stack.Tags)),
            x => new CardSortFields(x.Stack.Name, x.Stack.AddedAt, x.Stack.SetCode, x.Stack.SetNumber, x.Printing, x.Price),
            options.Sort, options.Descending);
        return sorted.Select(x => (x.Stack.Row, x.Price)).ToList();
    }
}
