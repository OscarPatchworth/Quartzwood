namespace Quartzwood.Server.Services.Cards;

// Which copies to take from which boxes to collect a list of cards, opening as FEW boxes as possible.
//
// Picking the fewest boxes is the "set cover" problem: finding the true best answer means trying every
// combination of boxes, which gets impossibly slow as a collection grows. The standard approach, used here:
//  1. Greedy: keep opening the box that gives you the most of what you still need
//  2. Clean up: greedy can open a box early that later boxes make unnecessary (their spare copies cover
//     everything it gave), so try dropping each opened box, smallest first
// Not always perfect, but close, and instant even for thousands of cards
public static class FetchPlanner
{
    // Copies of one wanted card in one box: Stacks in the order they should be taken from
    public record Supply<TStack>(Guid BoxId, int Want, IReadOnlyList<(TStack Stack, IReadOnlyList<string> Ids)> Stacks)
    {
        public int Count => Stacks.Sum(s => s.Ids.Count);
    }

    // Wants[i]: how many copies of card i are needed. Supplies: where card i's copies are (by Want = i).
    // boxOrder: the order boxes are visited in (location order), which also breaks ties between equal boxes.
    // Returns, per box opened (in boxOrder), the copies to take from each stack; and per card how many were found
    public static (List<(Guid BoxId, List<(TStack Stack, List<string> Ids)> Take)> Boxes, int[] Found) Plan<TStack>(
        IReadOnlyList<int> wants, IReadOnlyList<Supply<TStack>> supplies, IReadOnlyList<Guid> boxOrder)
    {
        var rank = boxOrder.Select((id, index) => (id, index)).ToDictionary(x => x.id, x => x.index);
        // box -> card -> copies available there
        var available = supplies
            .GroupBy(s => s.BoxId)
            .ToDictionary(g => g.Key, g => g.GroupBy(s => s.Want).ToDictionary(w => w.Key, w => w.Sum(s => s.Count)));

        var remaining = wants.ToArray();
        // box -> card -> copies taken from it
        var taken = new Dictionary<Guid, Dictionary<int, int>>();

        // 1. Greedy
        while (remaining.Any(r => r > 0))
        {
            var best = available.Keys
                .Where(box => !taken.ContainsKey(box))
                .Select(box => (Box: box, Gain: available[box].Sum(pair => Math.Min(pair.Value, remaining[pair.Key]))))
                .Where(x => x.Gain > 0)
                .OrderByDescending(x => x.Gain)
                .ThenBy(x => rank.GetValueOrDefault(x.Box, int.MaxValue))
                .FirstOrDefault();
            if (best.Gain == 0) break;   // nothing left anywhere: the rest of the list isn't in the collection

            var take = new Dictionary<int, int>();
            foreach (var (card, count) in available[best.Box])
            {
                var n = Math.Min(count, remaining[card]);
                if (n == 0) continue;
                take[card] = n;
                remaining[card] -= n;
            }
            taken[best.Box] = take;
        }

        // 2. Clean up: drop a box when the other opened boxes have enough spare copies to cover it
        foreach (var box in taken.OrderBy(pair => pair.Value.Values.Sum()).Select(pair => pair.Key).ToList())
        {
            var others = taken.Keys.Where(b => b != box).ToList();
            int Spare(Guid b, int card) => available[b].GetValueOrDefault(card) - taken[b].GetValueOrDefault(card);
            if (!taken[box].All(pair => others.Sum(b => Spare(b, pair.Key)) >= pair.Value)) continue;

            foreach (var (card, needed) in taken[box])
            {
                var left = needed;
                foreach (var other in others.OrderByDescending(b => Spare(b, card)))
                {
                    var n = Math.Min(left, Spare(other, card));
                    if (n <= 0) continue;
                    taken[other][card] = taken[other].GetValueOrDefault(card) + n;
                    left -= n;
                }
            }
            taken.Remove(box);
        }

        // Which actual copies: from each box, the first stacks (in the given order) until the count is reached
        var boxes = taken.Keys
            .OrderBy(box => rank.GetValueOrDefault(box, int.MaxValue))
            .Select(box =>
            {
                var picks = new List<(TStack Stack, List<string> Ids)>();
                foreach (var supply in supplies.Where(s => s.BoxId == box))
                {
                    var left = taken[box].GetValueOrDefault(supply.Want);
                    foreach (var (stack, ids) in supply.Stacks)
                    {
                        if (left == 0) break;
                        var chosen = ids.Take(left).ToList();
                        picks.Add((stack, chosen));
                        left -= chosen.Count;
                    }
                }
                return (box, picks);
            })
            .ToList();

        var found = wants.Select((want, card) => want - remaining[card]).ToArray();
        return (boxes, found);
    }
}
