namespace Quartzwood.Server.Models;

// Who can see a group or box (and everything inside it).
// Groups and boxes store a Visibility? where null = "same as the group it's in": the effective visibility
// is worked out when it's read, walking up until something has its own setting (a root group with none = Private).
// So changing a group changes every child still on "same as parent", while children with their own setting keep it
public enum Visibility
{
    // Only members of the Entity that owns it
    Private,
    // Anyone with the link can view it (not edit), even when logged out
    Unlisted,
    // For now the same as Unlisted (later: findable in a public listing)
    Public
}

public static class VisibilityText
{
    // "Private" / "Unlisted" / "Public" (any case) -> the value; null or "" -> null (same as parent).
    // Anything else, including numbers (Enum.TryParse would accept "1"), is rejected
    public static bool TryParse(string? text, out Visibility? value)
    {
        value = null;
        if (string.IsNullOrWhiteSpace(text)) return true;
        foreach (var option in Enum.GetValues<Visibility>())
        {
            if (string.Equals(option.ToString(), text.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                value = option;
                return true;
            }
        }
        return false;
    }
}
