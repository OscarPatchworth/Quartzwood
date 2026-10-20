using Microsoft.EntityFrameworkCore;
using Quartzwood.Server.Data;
using Quartzwood.Server.Models;

namespace Quartzwood.Server.Repositories;

public class CardRepository : ICardRepository
{
    private readonly AppDbContext _context;

    public CardRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<CardInstance?> GetByIdAsync(Guid id)
        => await _context.Cards
            .Include(c => c.CardTags)
            .ThenInclude(ct => ct.Tag)
            .FirstOrDefaultAsync(c => c.Id == id);

    public async Task<List<CardInstance>> SearchAsync(IReadOnlyCollection<Guid> entityIds, string text, int take)
    {
        // Escape LIKE's wildcards so searching for "50%" or "a_b" matches them literally
        var escaped = text.Replace(@"\", @"\\").Replace("%", @"\%").Replace("_", @"\_");
        var pattern = $"%{escaped}%";

        // One query: Entity -> its Groups -> their Boxes -> their Cards, all via indexes,
        // then the name check runs only on those cards. SQLite's LIKE is case-insensitive
        var query = _context.Cards
            .AsNoTracking()
            .Include(c => c.Box)
            .Where(c => entityIds.Contains(c.Box.Group.EntityId));

        // Empty text = every card (a filter-only search, e.g. all cards with mana value 2-4)
        if (text.Length > 0)
            query = query.Where(c => EF.Functions.Like(c.Name, pattern, @"\")
                || EF.Functions.Like(c.SetCode, escaped, @"\"));

        return await query
            .OrderBy(c => c.Name)
            .Take(take)
            .ToListAsync();
    }

    public async Task<IEnumerable<CardInstance>> GetAllAsync()
        => await _context.Cards
            .Include(c => c.CardTags)
            .ThenInclude(ct => ct.Tag)
            .ToListAsync();

    public async Task<IEnumerable<CardInstance>> GetByBoxAsync(Guid boxId)
        => await _context.Cards
            .Where(c => c.BoxId == boxId)
            .Include(c => c.CardTags)
            .ThenInclude(ct => ct.Tag)
            .ToListAsync();

    // One SaveChanges for all of them: a single database transaction however many copies there are
    public async Task AddRangeAsync(IEnumerable<CardInstance> cards)
    {
        _context.Cards.AddRange(cards);
        await _context.SaveChangesAsync();
    }

    public async Task<CardInstance> UpdateAsync(CardInstance card)
    {
        _context.Cards.Update(card);
        await _context.SaveChangesAsync();
        return card;
    }

    // ExecuteUpdate/ExecuteDelete send the SQL straight to the database: no loading cards into memory first.
    // Only the fields that were given go in the SET list:
    //   UPDATE Cards SET Condition = @c, FoilType = @f WHERE Id IN (...)
    public Task<int> UpdateManyAsync(IReadOnlyCollection<Guid> ids, CardChanges changes)
        => _context.Cards
            .Where(c => ids.Contains(c.Id))
            .ExecuteUpdateAsync(set =>
            {
                if (changes.Condition is { } condition) set.SetProperty(c => c.Condition, condition);
                if (changes.FoilType is { } foilType) set.SetProperty(c => c.FoilType, foilType);
                if (changes.Language is { } language) set.SetProperty(c => c.Language, language);
                if (changes.IsProxy is { } isProxy) set.SetProperty(c => c.IsProxy, isProxy);
                if (changes.IsSigned is { } isSigned) set.SetProperty(c => c.IsSigned, isSigned);
            });

    // A move is just pointing the cards at another box: the same rows keep their ids, tags and notes
    public Task<int> MoveManyAsync(IReadOnlyCollection<Guid> ids, Guid boxId)
        => _context.Cards
            .Where(c => ids.Contains(c.Id))
            .ExecuteUpdateAsync(set => set.SetProperty(c => c.BoxId, boxId));

    // The cards' CardTags rows go too: the database deletes them itself (ON DELETE CASCADE)
    public Task<int> DeleteManyAsync(IReadOnlyCollection<Guid> ids)
        => _context.Cards
            .Where(c => ids.Contains(c.Id))
            .ExecuteDeleteAsync();

    public async Task DeleteAsync(Guid id)
    {
        var card = await GetByIdAsync(id);
        if (card is not null)
        {
            _context.Cards.Remove(card);
            await _context.SaveChangesAsync();
        }
    }
}