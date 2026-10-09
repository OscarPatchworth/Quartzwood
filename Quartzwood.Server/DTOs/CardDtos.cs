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
    Guid? BoxId,
    IEnumerable<string> Tags
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
    string FoilType = "None",
    string StampType = "None",
    string Language = "en",
    bool IsProxy = false,
    bool IsSigned = false,
    bool IsList = false,
    string? AlterArtist = null,
    string? Notes = null,
    Guid? BoxId = null,
    DateOnly? AcquiredDate = null,
    decimal? PurchasePrice = null
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