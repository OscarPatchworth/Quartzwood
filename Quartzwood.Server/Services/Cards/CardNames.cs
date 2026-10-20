using System.Globalization;
using System.Text;

namespace Quartzwood.Server.Services.Cards;

// Matching card names the way a person types them: "lim-dul's vault" finds "Lim-Dûl's Vault",
// "aether vial" finds "Æther Vial", and "Delver of Secrets" finds "Delver of Secrets // Insectile Aberration"
public static class CardNames
{
    // Case, accents, ligatures, curly apostrophes and extra spaces don't matter
    public static string Normalise(string name)
    {
        var text = name.Trim()
            .Replace("Æ", "Ae").Replace("æ", "ae")
            .Replace('’', '\'').Replace('‘', '\'')
            .Normalize(NormalizationForm.FormD);

        var result = new StringBuilder(text.Length);
        var lastWasSpace = false;
        foreach (var c in text)
        {
            // FormD splits "û" into "u" + a combining accent: drop the accent
            if (CharUnicodeInfo.GetUnicodeCategory(c) == UnicodeCategory.NonSpacingMark) continue;
            if (char.IsWhiteSpace(c))
            {
                if (!lastWasSpace) result.Append(' ');
                lastWasSpace = true;
                continue;
            }
            result.Append(char.ToLowerInvariant(c));
            lastWasSpace = false;
        }
        return result.ToString();
    }

    // Every name a card answers to, normalised: its full name and, for double-faced/split cards, each face
    public static IEnumerable<string> Keys(string name)
    {
        var full = Normalise(name);
        yield return full;
        if (!full.Contains(" // ")) yield break;
        foreach (var face in full.Split(" // ").Distinct())
            if (face.Length > 0 && face != full) yield return face;
    }
}
