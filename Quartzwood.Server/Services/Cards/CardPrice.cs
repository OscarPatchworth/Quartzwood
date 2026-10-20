using Quartzwood.Server.Models;
using Quartzwood.Server.Services.Scryfall;

namespace Quartzwood.Server.Services.Cards;

// A card's price: the one place that decides which of its printing's prices applies (and so which currency
// the app shows). Today: TCGplayer USD. A per-user currency would start here
public static class CardPrice
{
    public const string Currency = "USD";

    // The price for the card's own finish. If that one's missing, the closest other finish stands in
    // (some printings only exist in foil, so a "non-foil" one is usually a data entry slip),
    // except a foil never falls back to the cheaper non-foil price
    public static decimal? For(ScryfallGameplay? printing, FoilType foilType) => printing is null ? null : foilType switch
    {
        FoilType.Traditional => printing.PriceUsdFoil ?? printing.PriceUsdEtched,
        FoilType.Other => printing.PriceUsdEtched ?? printing.PriceUsdFoil,
        _ => printing.PriceUsd ?? printing.PriceUsdFoil ?? printing.PriceUsdEtched,
    };
}
