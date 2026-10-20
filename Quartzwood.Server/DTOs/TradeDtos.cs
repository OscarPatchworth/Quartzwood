namespace Quartzwood.Server.DTOs;

// A card coming IN in a trade, described the way the add bar describes a card: set + number, or just a name
public record TradeCardDto(
    string? SetCode,
    string? SetNumber,
    string? Name,
    string Condition = "NM",
    string FoilType = "None",
    string StampType = "None",
    string Language = "en",
    bool IsProxy = false,
    bool IsSigned = false,
    bool IsList = false,
    int Quantity = 1
);

public record TradeQuoteRequestDto(
    List<TradeCardDto> Incoming
);

// One incoming card, priced. Error set = it can't be added as written (e.g. not on Scryfall)
public record TradeQuoteItemDto(
    string? Name,
    string? SetCode,
    string? SetNumber,
    string? ScryfallId,
    // One copy, in USD for its foil type; null = no price (or a name-only card, which has no printing)
    decimal? UnitPrice,
    string? Error
);

public record TradeQuoteDto(
    // Same order as the request
    List<TradeQuoteItemDto> Items,
    // Sum of UnitPrice x Quantity over the priced cards
    decimal Total
);

// Confirming a trade: add Incoming to the "Cards from Trade" box, delete OutgoingCardIds (all or nothing)
public record TradeConfirmDto(
    List<TradeCardDto> Incoming,
    List<Guid> OutgoingCardIds
);

public record TradeResultDto(
    Guid BoxId,
    string BoxName,
    int CardsAdded,
    int CardsRemoved
);
