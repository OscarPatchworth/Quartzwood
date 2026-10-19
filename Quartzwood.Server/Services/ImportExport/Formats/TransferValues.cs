using System.Globalization;
using Quartzwood.Server.Models;

namespace Quartzwood.Server.Services.ImportExport.Formats;

// Converts the different ways apps write conditions, foils, languages, ... to and from ours.
// Reading is deliberately forgiving ("Near Mint", "near_mint", "NM" all work)
public static class TransferValues
{
    public static Condition? ParseCondition(string? value)
    {
        var v = Normalise(value);
        if (v.Length == 0) return Condition.NM;   // not given: assume near mint
        return v switch
        {
            "nm" or "m" or "mint" or "nearmint" => Condition.NM,
            "lp" or "lightlyplayed" or "lightplayed" or "goodlightlyplayed" or "excellent" or "ex" or "good" => Condition.LP,
            "mp" or "moderatelyplayed" or "played" or "pl" => Condition.MP,
            "hp" or "heavilyplayed" => Condition.HP,
            "dmg" or "d" or "damaged" or "poor" or "po" => Condition.DMG,
            _ => null
        };
    }

    public static FoilType ParseFoil(string? value)
        => Normalise(value) switch
        {
            "foil" or "true" or "yes" or "f" => FoilType.Traditional,
            "etched" or "etchedfoil" or "e" => FoilType.Other,
            _ => FoilType.None
        };

    public static bool ParseBool(string? value)
        => Normalise(value) is "true" or "yes" or "1" or "x";

    public static decimal? ParsePrice(string? value)
        => decimal.TryParse(value?.Trim().TrimStart('$', '€', '£'), NumberStyles.Number, CultureInfo.InvariantCulture, out var price)
            ? price
            : null;

    // Scryfall language code <-> the English name Moxfield/Deckbox use
    private static readonly Dictionary<string, string> LanguageNames = new(StringComparer.OrdinalIgnoreCase)
    {
        ["en"] = "English", ["ja"] = "Japanese", ["de"] = "German", ["fr"] = "French",
        ["it"] = "Italian", ["es"] = "Spanish", ["pt"] = "Portuguese", ["ru"] = "Russian",
        ["ko"] = "Korean", ["zhs"] = "Chinese Simplified", ["zht"] = "Chinese Traditional",
        ["he"] = "Hebrew", ["la"] = "Latin", ["grc"] = "Ancient Greek", ["ar"] = "Arabic",
        ["sa"] = "Sanskrit", ["ph"] = "Phyrexian",
    };

    public static string ParseLanguage(string? value)
    {
        var v = value?.Trim() ?? string.Empty;
        if (v.Length == 0) return "en";
        if (LanguageNames.ContainsKey(v)) return v.ToLowerInvariant();
        var byName = LanguageNames.FirstOrDefault(pair => string.Equals(pair.Value, v, StringComparison.OrdinalIgnoreCase));
        return byName.Key ?? v.ToLowerInvariant();
    }

    public static string LanguageName(string code)
        => LanguageNames.TryGetValue(code, out var name) ? name : code;

    public static string FormatPrice(decimal? price)
        => price?.ToString("0.00", CultureInfo.InvariantCulture) ?? string.Empty;

    // "Near Mint" / "near_mint" / "Near-Mint" -> "nearmint"
    private static string Normalise(string? value)
        => new string((value ?? string.Empty).Where(char.IsLetterOrDigit).ToArray()).ToLowerInvariant();
}
