namespace Quartzwood.Server.DTOs;

// The file's text: pasted, or read from a chosen file by the browser
public record ImportRequestDto(
    string Content
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
