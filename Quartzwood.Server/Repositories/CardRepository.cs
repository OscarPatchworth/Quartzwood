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
        return await _context.Cards
            .AsNoTracking()
            .Include(c => c.Box)
            .Where(c => entityIds.Contains(c.Box.Group.EntityId))
            .Where(c => EF.Functions.Like(c.Name, pattern, @"\")
                || EF.Functions.Like(c.SetCode, escaped, @"\"))
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

    public async Task<CardInstance> AddAsync(CardInstance card)
    {
        _context.Cards.Add(card);
        await _context.SaveChangesAsync();
        return card;
    }

    public async Task<CardInstance> UpdateAsync(CardInstance card)
    {
        _context.Cards.Update(card);
        await _context.SaveChangesAsync();
        return card;
    }

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