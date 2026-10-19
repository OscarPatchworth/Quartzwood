using Quartzwood.Server.Models;

namespace Quartzwood.Server.Services.Scryfall;

public static class ScryfallPrintingKey
{
    // Turns what's printed on the card into the set code + collector number Scryfall files it under
    public static (string SetCode, string SetNumber) Resolve(string setCode, string setNumber, string? stampType, bool isList)
    {
        var scryfallSetCode = setCode;
        var scryfallSetNumber = setNumber;

        // Scryfall alters setCodes of:
        // 1| Stamped cards: planeswalker & pre-release
        // 2| List & Promo cards i.e. Japan Standard Cup: PRM => PJSC

        // Using If/Else prevents a stamped List card from being processed
        if(stampType != nameof(StampType.None))
        {
            switch (stampType){
                case nameof(StampType.None):
                    break;
                case nameof(StampType.Promo):
                    scryfallSetCode = "p" + scryfallSetCode;
                    scryfallSetNumber = scryfallSetNumber + "p";
                    break;
                case nameof(StampType.Prerelease):
                    scryfallSetCode = "p" + scryfallSetCode;
                    scryfallSetNumber = scryfallSetNumber + "s";
                    break;
                default:    // If null
                    break;
            }
        }else if (isList && scryfallSetCode != "PLST")
        {
                scryfallSetNumber = scryfallSetCode + "-" + scryfallSetNumber;
                scryfallSetCode = "PLST";
        }
        // Only when the number really is "SET-NUMBER" (e.g. IKO-1): a plain "PLST-1" typed in has no inner set,
        // and is left as-is so the lookup simply finds nothing instead of crashing on a missing part
        else if (!isList && scryfallSetCode == "PLST" && scryfallSetNumber.Contains('-'))
        {
            var parseSetId = scryfallSetNumber.Split("-", 2);
            scryfallSetCode = parseSetId[0];
            scryfallSetNumber = parseSetId[1];
        }

        return (scryfallSetCode, scryfallSetNumber);
    }
}
