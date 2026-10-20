using Microsoft.EntityFrameworkCore;
using Quartzwood.Server.Data;
using Quartzwood.Server.DTOs;
using Quartzwood.Server.Models;

namespace Quartzwood.Server.Services.Dividers;

public class DividerService : IDividerService
{
    // Same limit as box names
    private const int MaxNameLength = 100;
    // Plenty for a real box, and stops a runaway script filling one with thousands
    private const int MaxDividersPerBox = 200;

    private readonly AppDbContext _context;

    public DividerService(AppDbContext context)
    {
        _context = context;
    }

    public Task<List<DividerDto>> GetByBoxAsync(Guid boxId)
        => _context.Dividers
            .AsNoTracking()
            .Where(d => d.BoxId == boxId)
            .OrderBy(d => d.SortOrder)
            .Select(d => new DividerDto(d.Id, d.Name, d.SortOrder, d.BoxId, d.Cards.Count))
            .ToListAsync();

    public async Task<DividerDto> AddAsync(AddDividerDto dto)
    {
        var name = CleanName(dto.Name);

        // A missing boxId arrives as Guid.Empty, which would otherwise fail as a DB foreign key error (500)
        if (!await _context.Boxes.AnyAsync(b => b.Id == dto.BoxId))
            throw new ArgumentException("Box not found.");

        var sortOrders = await _context.Dividers
            .Where(d => d.BoxId == dto.BoxId)
            .Select(d => d.SortOrder)
            .ToListAsync();
        if (sortOrders.Count >= MaxDividersPerBox)
            throw new ArgumentException($"A box can have at most {MaxDividersPerBox} dividers.");

        var divider = new Divider
        {
            Name = name,
            BoxId = dto.BoxId,
            SortOrder = sortOrders.Count == 0 ? 0 : sortOrders.Max() + 1,
        };
        _context.Dividers.Add(divider);
        await _context.SaveChangesAsync();
        return new DividerDto(divider.Id, divider.Name, divider.SortOrder, divider.BoxId, 0);
    }

    public async Task<DividerDto?> RenameAsync(Guid id, string name)
    {
        var cleanName = CleanName(name);
        var divider = await _context.Dividers.FirstOrDefaultAsync(d => d.Id == id);
        if (divider is null) return null;

        divider.Name = cleanName;
        await _context.SaveChangesAsync();
        return new DividerDto(divider.Id, divider.Name, divider.SortOrder, divider.BoxId,
            await _context.Cards.CountAsync(c => c.DividerId == id));
    }

    public async Task<List<DividerDto>> ReorderAsync(Guid boxId, IReadOnlyList<Guid> dividerIds)
    {
        var dividers = await _context.Dividers.Where(d => d.BoxId == boxId).ToListAsync();

        // The whole order, not a partial one: two people reordering at once can't leave duplicate positions
        if (dividerIds.Count != dividers.Count || dividerIds.Distinct().Count() != dividerIds.Count
            || !dividerIds.All(id => dividers.Any(d => d.Id == id)))
            throw new ArgumentException("Send every divider in the box, each once.");

        var byId = dividers.ToDictionary(d => d.Id);
        for (var i = 0; i < dividerIds.Count; i++)
            byId[dividerIds[i]].SortOrder = i;
        await _context.SaveChangesAsync();

        return await GetByBoxAsync(boxId);
    }

    // The database clears the cards' DividerId itself (ON DELETE SET NULL)
    public async Task<bool> DeleteAsync(Guid id)
        => await _context.Dividers.Where(d => d.Id == id).ExecuteDeleteAsync() > 0;

    private static string CleanName(string? name)
    {
        var clean = name?.Trim() ?? string.Empty;
        if (clean.Length == 0) throw new ArgumentException("Give the divider a name.");
        if (clean.Length > MaxNameLength)
            throw new ArgumentException($"Divider names can be at most {MaxNameLength} characters.");
        return clean;
    }
}
