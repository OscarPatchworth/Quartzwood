using Quartzwood.Server.DTOs;
using Quartzwood.Server.Models;
using Quartzwood.Server.Repositories;

namespace Quartzwood.Server.Services.Cards;

public class CardQueryService : ICardQueryService
{
    // Most cards one search returns: enough to browse, small enough that a 1-letter search stays fast
    private const int SearchLimit = 200;

    private readonly ICardRepository _cards;
    private readonly IGroupRepository _groups;

    public CardQueryService(ICardRepository cards, IGroupRepository groups)
    {
        _cards = cards;
        _groups = groups;
    }

    public async Task<CardSearchResponseDto> SearchAsync(IReadOnlyCollection<Guid> entityIds, string text)
    {
        // Ask for one extra card: if it comes back, there are more matches than we show
        var cards = await _cards.SearchAsync(entityIds, text, SearchLimit + 1);
        var hasMore = cards.Count > SearchLimit;
        if (hasMore) cards = cards.Take(SearchLimit).ToList();
        if (cards.Count == 0) return new CardSearchResponseDto([], false);

        // One query for every group in the user's Entities (usually tens of rows),
        // then each location path is built in memory by following ParentGroupId up
        var groupsById = (await _groups.GetTreeByEntitiesAsync(entityIds)).ToDictionary(g => g.Id);
        var pathCache = new Dictionary<Guid, List<LocationStepDto>>();

        List<LocationStepDto> PathTo(Guid groupId)
        {
            if (pathCache.TryGetValue(groupId, out var cached)) return cached;

            var path = new List<LocationStepDto>();
            Guid? currentId = groupId;
            // The step limit is a safety net: group moves already reject loops
            while (currentId is not null && groupsById.TryGetValue(currentId.Value, out var group)
                   && path.Count <= groupsById.Count)
            {
                path.Insert(0, new LocationStepDto(group.Id, group.Name));
                currentId = group.ParentGroupId;
            }

            pathCache[groupId] = path;
            return path;
        }

        // Same grouping as the box page, plus the box: identical copies in one box = one row
        var results = cards
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
                return new CardSearchResultDto(
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
                    PathTo(box.GroupId)
                );
            })
            .OrderBy(r => r.Name)
            .ThenBy(r => string.Join("/", r.GroupPath.Select(step => step.Name)) + "/" + r.BoxName)
            .ToList();

        return new CardSearchResponseDto(results, hasMore);
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