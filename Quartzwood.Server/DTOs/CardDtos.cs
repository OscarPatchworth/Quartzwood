namespace Quartzwood.Server.DTOs;

// What the API returns for a card
public record CardDto(
    Guid Id,
    string? Name,
    string? SetCode,
    string? SetNumber,
    string? ScryfallId,
    string Condition,
    string FoilType,
    string StampType,
    string Language,
    bool IsProxy,
    bool IsSigned,
    bool IsList,
    string? AlterArtist,
    string? Notes,
    Guid BoxId,
    IEnumerable<string> Tags,
    // In CardPrice.Currency (USD), for the card's foil type; null = no price. Only filled in by GET /api/cards/{id}
    decimal? Price = null
);

// What the API returns for a collated group of cards
public record GroupedCardDto(
    string? Name,
    string? SetCode,
    string? SetNumber,
    string? ScryfallId,
    string Condition,
    string FoilType,
    string StampType,
    int Count,
    List<string> Ids
);

// What the API accepts to create a card
public record AddCardDto(
    string? SetCode,
    string? SetNumber,
    string? Name,
    string Condition,
    Guid BoxId,
    string FoilType = "None",
    string StampType = "None",
    string Language = "en",
    bool IsProxy = false,
    bool IsSigned = false,
    bool IsList = false,
    string? AlterArtist = null,
    string? Notes = null,
    DateOnly? AcquiredDate = null,
    decimal? PurchasePrice = null,
    // How many identical copies to add (one lookup, one save)
    int Quantity = 1
);

// What the API accepts to update a card
public record UpdateCardDto(
    string? SetCode,
    string? SetNumber,
    string? Name,
    string? Condition,
    string? FoilType,
    string? StampType,
    string? Language,
    bool? IsProxy,
    bool? IsSigned,
    bool? IsList,
    string? AlterArtist,
    string? Notes,
    Guid? BoxId,
    DateOnly? AcquiredDate,
    decimal? PurchasePrice
);

// One step of a card's location: a group on the way down from the root to the card's box
public record LocationStepDto(
    Guid Id,
    string Name
);

// What collection search returns: identical copies in the same box, plus where that box is
public record CardSearchResultDto(
    string? Name,
    string? SetCode,
    string? SetNumber,
    string? ScryfallId,
    string Condition,
    string FoilType,
    string StampType,
    int Count,
    List<string> Ids,
    Guid BoxId,
    string BoxName,
    // Root group first, the box's own group last
    List<LocationStepDto> GroupPath
);

public record CardSearchResponseDto(
    List<CardSearchResultDto> Results,
    // true when more cards matched than were returned: the user should narrow the search
    bool HasMore
);
// Mass actions: one change applied to many cards in one request (all of them, or none if any id isn't yours)

public record BulkCardIdsDto(
    List<Guid> CardIds
);

// Only fields that don't change WHICH printing a card is (set, number, name, stamp and List are left out).
// null = leave that field as it is on every card
public record BulkUpdateCardsDto(
    List<Guid> CardIds,
    string? Condition,
    string? FoilType,
    string? Language,
    bool? IsProxy,
    bool? IsSigned
);

public record BulkMoveCardsDto(
    List<Guid> CardIds,
    Guid BoxId
);

// How many cards were changed
public record BulkResultDto(
    int Count
);
