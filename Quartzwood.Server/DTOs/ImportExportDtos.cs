namespace Quartzwood.Server.DTOs;

// The file's text: pasted, or read from a chosen file by the browser.
// DividerId: add the cards behind this divider (one in the box); null = not behind one
public record ImportRequestDto(
    string Content,
    Guid? DividerId = null,
    // Changes made to the list's cards in the compare view, applied in order before adding
    List<ImportEditDto>? Edits = null
);

// A change to some of the list's cards before they're added (the list isn't saved anywhere, so the changes
// are sent with it each time). Key: the incoming stack's key, as the compare view last showed it.
// Count: how many of its copies. Remove: take them off the list; otherwise they get the fields below
public record ImportEditDto(
    string Key,
    int Count,
    bool Remove = false,
    string? Condition = null,
    string? FoilType = null,
    string? StampType = null,
    string? Language = null,
    bool IsProxy = false,
    bool IsSigned = false,
    bool IsList = false,
    string? AlterArtist = null,
    string? Notes = null
);

// Compare a file with what's in the box (or behind one of its dividers) before importing it.
// Sort: one of the box page's sorts ("printed", "name", ...); Descending flips it
public record ImportCompareRequestDto(
    string Content,
    Guid? DividerId = null,
    string? Sort = null,
    bool Descending = false,
    List<ImportEditDto>? Edits = null
);

// Identical cards in the file (after any edits): same printing, condition, finish, language and so on.
// Key names the stack in an ImportEditDto
public record ImportIncomingStackDto(
    string Key,
    string Name,
    string SetCode,
    string SetNumber,
    string ScryfallId,
    string Condition,
    string FoilType,
    string StampType,
    string Language,
    bool IsProxy,
    bool IsSigned,
    bool IsList,
    string? AlterArtist,
    string? Notes,
    int Count
);

// One printing: the stacks of it already there (top row) and in the file (bottom row). Either can be empty
public record ImportCompareColumnDto(
    List<GroupedCardDto> Existing,
    List<ImportIncomingStackDto> Incoming
);

public record ImportCompareDto(
    string Format,
    // In the chosen sort order
    List<ImportCompareColumnDto> Columns,
    // How many cards importing would add (lines that failed aren't counted)
    int IncomingCount,
    // Lines that can't be imported
    List<ImportFailureDto> Failed
);

public record ImportFailureDto(
    int Line,
    string Text,
    string Reason
);

public record ImportResultDto(
    // Which format the file was detected as, e.g. "Moxfield / Deckbox CSV"
    string Format,
    int CardsAdded,
    int LinesAdded,
    // Lines that couldn't be imported (everything else was)
    List<ImportFailureDto> Failed
);

// One of the formats export/import supports, for the UI to list
public record TransferFormatDto(
    string Key,
    string DisplayName
);
