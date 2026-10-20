using Microsoft.AspNetCore.Mvc;
using Quartzwood.Server.Services.Cards;

namespace Quartzwood.Server.DTOs;

// The sort + filter query parameters every card list endpoint takes (box page, collection search, trade options).
// An endpoint writes [FromQuery] CardListQuery list, and ?sort=price&desc=true&tags=Trade... fills this in.
// [FromQuery(Name = ...)] keeps the URL names short and camelCase
public class CardListQuery
{
    // name (default), added, printed, manaValue, color, price
    [FromQuery(Name = "sort")] public string? Sort { get; set; }
    [FromQuery(Name = "desc")] public bool Desc { get; set; }

    // Inclusive ranges, either end optional
    [FromQuery(Name = "mvMin")] public double? MvMin { get; set; }
    [FromQuery(Name = "mvMax")] public double? MvMax { get; set; }
    // USD, for each card's foil type
    [FromQuery(Name = "priceMin")] public decimal? PriceMin { get; set; }
    [FromQuery(Name = "priceMax")] public decimal? PriceMax { get; set; }

    // ?tags=Trade&tags=Commander: cards with ALL of them (anyone's tag with that name counts)
    [FromQuery(Name = "tags")] public string[]? Tags { get; set; }

    // An error message for a bad combination, or null when it's fine
    public string? Validate() => CardListOptions.Validate(MvMin, MvMax, PriceMin, PriceMax);

    public virtual CardListOptions ToOptions() => new(
        CardSorting.Parse(Sort), Desc, MvMin, MvMax, PriceMin, PriceMax, Tags);
}

// For lists that span many boxes (collection search, trade options): also "where the cards are"
public class CardSearchQuery : CardListQuery
{
    // One box, or a group and every group inside it
    [FromQuery(Name = "boxId")] public Guid? BoxId { get; set; }
    [FromQuery(Name = "groupId")] public Guid? GroupId { get; set; }

    public override CardListOptions ToOptions() => base.ToOptions() with { BoxId = BoxId, GroupId = GroupId };
}
