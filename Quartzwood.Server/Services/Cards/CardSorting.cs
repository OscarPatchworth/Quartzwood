using Quartzwood.Server.Services.Scryfall;

namespace Quartzwood.Server.Services.Cards;

public enum CardSort
{
    Name,       // A-Z
    Added,      // when it was added to Quartzwood
    Printed,    // release date of the printing, then set, then collector number
    ManaValue,
    Color,      // W, U, B, R, G, multicolour, colourless, lands
    Price,      // the card's price for its foil type (see CardPrice)
}

// What a stack of cards is sorted by: its own values plus its printing's (from scryfall.db)
public record CardSortFields(
    string? Name,
    DateTime? AddedAt,
    string? SetCode,
    string? SetNumber,
    ScryfallGameplay? Gameplay,
    decimal? Price
);

// The sort rules for card lists (box page, collection search), in one place.
// Each sort has a main rule, then name and printing as tiebreakers so equal cards keep a sensible order.
// Missing values (no printing in the local data, cards added before "added" was recorded) always go
// LAST, even when the order is reversed: reversing shouldn't put a pile of unknowns at the top
public static class CardSorting
{
    // "name", "manaValue", "MANAVALUE"... -> CardSort; null/unknown -> Name
    public static CardSort Parse(string? sort)
        => Enum.TryParse<CardSort>(sort, ignoreCase: true, out var parsed) ? parsed : CardSort.Name;

    public static List<T> Sort<T>(IEnumerable<T> items, Func<T, CardSortFields> fields, CardSort sort, bool descending)
    {
        // Work out each item's fields once, not on every comparison
        var withFields = items.Select(item => (Item: item, Fields: fields(item))).ToList();
        var main = MainComparison(sort, descending);
        var comparer = Comparer<CardSortFields>.Create((a, b) =>
        {
            var result = main(a, b);
            if (result != 0) return result;
            result = string.Compare(a.Name, b.Name, StringComparison.OrdinalIgnoreCase);
            return result != 0 ? result : ComparePrinting(a, b);
        });

        // OrderBy is a stable sort: items the comparer calls equal stay in their original order
        return withFields.OrderBy(x => x.Fields, comparer).Select(x => x.Item).ToList();
    }

    private static Comparison<CardSortFields> MainComparison(CardSort sort, bool descending) => sort switch
    {
        CardSort.Added => (a, b) => NullsLast(a.AddedAt, b.AddedAt, descending),
        // Not Flip(ComparePrinting(...)): that would flip "no release date goes last" too
        CardSort.Printed => (a, b) =>
        {
            var result = NullsLast(a.Gameplay?.ReleasedAt, b.Gameplay?.ReleasedAt, descending);
            return result != 0 ? result : Flip(ComparePrinting(a, b), descending);
        },
        CardSort.ManaValue => (a, b) => NullsLast(a.Gameplay?.ManaValue, b.Gameplay?.ManaValue, descending),
        CardSort.Color => (a, b) => NullsLast(ColorKey(a.Gameplay), ColorKey(b.Gameplay), descending),
        CardSort.Price => (a, b) => NullsLast(a.Price, b.Price, descending),
        _ => (a, b) => Flip(string.Compare(a.Name, b.Name, StringComparison.OrdinalIgnoreCase), descending),
    };

    // Release date, then set code, then collector number in number order (2 before 10, "12a" after 12).
    // No release date (no local printing) goes last
    private static int ComparePrinting(CardSortFields a, CardSortFields b)
    {
        var result = NullsLast(a.Gameplay?.ReleasedAt, b.Gameplay?.ReleasedAt, descending: false);
        if (result != 0) return result;
        result = string.Compare(a.SetCode, b.SetCode, StringComparison.OrdinalIgnoreCase);
        if (result != 0) return result;
        return CollectorNumberKey(a.SetNumber).CompareTo(CollectorNumberKey(b.SetNumber));
    }

    // "12a" -> (12, "a"); "★" (no digits) -> after every number
    private static (int Number, string Suffix) CollectorNumberKey(string? setNumber)
    {
        var text = setNumber ?? "";
        var digits = new string(text.TakeWhile(char.IsDigit).ToArray());
        return int.TryParse(digits, out var number)
            ? (number, text[digits.Length..])
            : (int.MaxValue, text);
    }

    // W=0 U=1 B=2 R=3 G=4, multicolour 5, colourless 6, lands 7 (colourless ones: Dryad Arbor stays green).
    // Multicolour is then ordered by how many colours, then which: "WU" (01) before "WB" (02) before "UB" (12).
    // A string so all of it compares in one go: "0", "1", ..., "5|2|01", "5|2|02", "5|3|012", "6", "7"
    private static string? ColorKey(ScryfallGameplay? gameplay)
    {
        var colors = gameplay?.Colors;
        if (colors is null) return null;
        if (colors.Length == 1) return "WUBRG".IndexOf(colors[0]).ToString();
        if (colors.Length > 1)
            return $"5|{colors.Length}|{string.Concat(colors.Select(c => "WUBRG".IndexOf(c)))}";
        return gameplay!.TypeLine?.Contains("Land", StringComparison.OrdinalIgnoreCase) == true ? "7" : "6";
    }

    private static int Flip(int result, bool descending) => descending ? -result : result;

    // Compares two maybe-missing values: a missing one is always after a present one, in either direction
    private static int NullsLast<TValue>(TValue? a, TValue? b, bool descending) where TValue : struct, IComparable<TValue>
    {
        if (a is null || b is null) return a is null ? (b is null ? 0 : 1) : -1;
        return Flip(a.Value.CompareTo(b.Value), descending);
    }

    private static int NullsLast(string? a, string? b, bool descending)
    {
        if (a is null || b is null) return a is null ? (b is null ? 0 : 1) : -1;
        return Flip(string.CompareOrdinal(a, b), descending);
    }
}
