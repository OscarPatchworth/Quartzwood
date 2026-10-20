namespace Quartzwood.Server.DTOs;

public record DividerDto(
    Guid Id,
    string Name,
    // Front of the box first
    int SortOrder,
    Guid BoxId,
    int CardCount
);

// A new divider goes at the back of the box
public record AddDividerDto(
    Guid BoxId,
    string Name
);

public record UpdateDividerDto(
    string Name
);

// Every divider in the box, in their new order (front first)
public record ReorderDividersDto(
    List<Guid> DividerIds
);
