using Microsoft.EntityFrameworkCore;
using Quartzwood.Server.Data;
using Quartzwood.Server.DTOs;
using Quartzwood.Server.Models;

namespace Quartzwood.Server.Services.Tags;

public class TagService : ITagService
{
    private readonly AppDbContext _context;

    public TagService(AppDbContext context)
    {
        _context = context;
    }

    public Task<List<TagDto>> GetMineAsync(Guid userId)
        => _context.Tags
            .AsNoTracking()
            .Where(t => t.OwnerId == userId)
            .OrderBy(t => t.Name)
            .Select(t => new TagDto(t.Id, t.Name))
            .ToListAsync();

    public async Task<int> ChangeTagsAsync(IReadOnlyCollection<Guid> cardIds, IEnumerable<string>? add,
        IEnumerable<string>? remove, Guid userId)
    {
        var toAdd = CleanNames(add);
        var toRemove = CleanNames(remove);
        if (toAdd.Count == 0 && toRemove.Count == 0) throw new ArgumentException("No tags to add or remove.");

        // All or nothing: a mass edit never leaves some cards tagged and others not
        await using var transaction = await _context.Database.BeginTransactionAsync();

        // Remove first, so "remove X, add X" ends with X on the cards.
        // By name, whoever owns the tag: you can already edit these cards, and you see every tag on them.
        // The Name column is NOCASE, so the IN (...) comparison ignores case
        if (toRemove.Count > 0)
        {
            await _context.CardTags
                .Where(ct => cardIds.Contains(ct.CardInstanceId) && toRemove.Contains(ct.Tag.Name))
                .ExecuteDeleteAsync();
        }

        if (toAdd.Count > 0)
        {
            var tags = await GetOrCreateMineAsync(toAdd, userId);
            var tagIds = tags.Select(t => t.Id).ToList();

            // Pairs that already exist are skipped (tagging a card "Trade" twice changes nothing)
            var existing = (await _context.CardTags
                    .Where(ct => cardIds.Contains(ct.CardInstanceId) && tagIds.Contains(ct.TagId))
                    .Select(ct => new { ct.CardInstanceId, ct.TagId })
                    .ToListAsync())
                .Select(pair => (pair.CardInstanceId, pair.TagId))
                .ToHashSet();

            _context.CardTags.AddRange(
                from cardId in cardIds
                from tagId in tagIds
                where !existing.Contains((cardId, tagId))
                select new CardTag { CardInstanceId = cardId, TagId = tagId });
            await _context.SaveChangesAsync();
        }

        await transaction.CommitAsync();
        return cardIds.Count;
    }

    // The user's own tags with these names; ones they've never used are created (owned by them)
    private async Task<List<Tag>> GetOrCreateMineAsync(List<string> names, Guid userId)
    {
        var mine = await _context.Tags
            .Where(t => t.OwnerId == userId && names.Contains(t.Name))
            .ToListAsync();

        foreach (var name in names)
        {
            if (mine.Any(t => string.Equals(t.Name, name, StringComparison.OrdinalIgnoreCase))) continue;
            var tag = new Tag { Name = name, OwnerId = userId };
            _context.Tags.Add(tag);
            mine.Add(tag);
        }
        return mine;
    }

    // Trimmed, no blanks, no duplicates ("Trade" and "trade" count once), at most Tag.MaxNameLength characters
    private static List<string> CleanNames(IEnumerable<string>? names)
    {
        var cleaned = (names ?? [])
            .Select(name => name.Trim())
            .Where(name => name.Length > 0)
            .DistinctBy(name => name.ToLowerInvariant())
            .ToList();

        var tooLong = cleaned.FirstOrDefault(name => name.Length > Tag.MaxNameLength);
        if (tooLong != null) throw new ArgumentException($"Tag names can be at most {Tag.MaxNameLength} characters: \"{tooLong}\".");
        return cleaned;
    }
}
