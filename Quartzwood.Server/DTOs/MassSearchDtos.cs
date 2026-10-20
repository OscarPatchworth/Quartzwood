namespace Quartzwood.Server.DTOs;

// ---- Mass search: look up a whole list of cards in your collection at once ----

// The list as typed, pasted, or read from a file (plain list, deck list, or Moxfield/ManaBox CSV)
public record MassSearchRequestDto(
    string Text
);

// One card of the list, and every copy of it you have
public record MassSearchEntryDto(
    // Scryfall's spelling when it's a known card ("lim-dul's vault" -> "Lim-Dûl's Vault"), else as typed
    string Name,
    // How many copies the list asks for
    int Wanted,
    // How many copies are in your collection (0 = not found)
    int Owned,
    // For the picture: one of your copies, or any printing when you have none
    string? ScryfallId,
    // false = no card has this name on Scryfall: probably a typo
    bool IsKnownCard,
    // Your copies, as search results: identical copies in one box = one row, in location order
    List<CardSearchResultDto> Stacks
);

public record MassSearchSkippedLineDto(
    int LineNumber,
    string Text,
    string Reason
);

public record MassSearchResponseDto(
    // How the list was read, e.g. "Card list" or "ManaBox CSV"
    string Format,
    // In the list's order
    List<MassSearchEntryDto> Entries,
    List<MassSearchSkippedLineDto> Skipped
);

// ---- Fetch plan: which copies to take out of which boxes ----

public record FetchWantDto(
    string Name,
    int Quantity
);

public record FetchPlanRequestDto(
    List<FetchWantDto> Cards
);

// One box to open, and what to take out of it
public record FetchPlanBoxDto(
    Guid BoxId,
    string BoxName,
    List<LocationStepDto> GroupPath,
    // Count and Ids are just the copies to take (a box may hold more)
    List<CardSearchResultDto> Cards
);

// A card the collection doesn't have enough copies of
public record FetchShortDto(
    string Name,
    int Wanted,
    int Found
);

public record FetchPlanDto(
    // In location order: the order to visit them in
    List<FetchPlanBoxDto> Boxes,
    List<FetchShortDto> Short,
    int CardCount
);

// Mass action: move cards into a box that's created for them (both happen, or neither)
public record BulkMoveToNewBoxDto(
    List<Guid> CardIds,
    string BoxName,
    Guid GroupId
);

public record BulkMoveToNewBoxResultDto(
    int Count,
    Guid BoxId,
    string BoxName
);
