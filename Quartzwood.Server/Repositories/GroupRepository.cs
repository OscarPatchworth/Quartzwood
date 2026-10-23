using Microsoft.EntityFrameworkCore;
using Quartzwood.Server.Data;
using Quartzwood.Server.Models;

namespace Quartzwood.Server.Repositories;

public class GroupRepository : IGroupRepository
{
    private readonly AppDbContext _context;

    public GroupRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Group?> GetByIdAsync(Guid id)
        => await _context.Groups
            .Include(g => g.ChildGroups)
            .Include(g => g.Boxes)
            .FirstOrDefaultAsync(g => g.Id == id);

    public async Task<IEnumerable<Group>> GetAllAsync()
        => await _context.Groups
            .Include(g => g.ChildGroups)
            .Include(g => g.Boxes)
            .ToListAsync();

    public async Task<List<Group>> GetTreeByEntitiesAsync(IReadOnlyCollection<Guid> entityIds)
        => await _context.Groups
            .AsNoTracking()
            .Where(g => entityIds.Contains(g.EntityId))
            .ToListAsync();

    public async Task<IEnumerable<Group>> GetByEntityAsync(Guid entityId)
        => await _context.Groups
            .Where(g => g.EntityId == entityId)
            .Include(g => g.Boxes)
            .ToListAsync();

    public async Task<IEnumerable<Group>> GetByParentGroupAsync(Guid parentGroupId)
        => await _context.Groups
            .Where(g => g.ParentGroupId == parentGroupId)
            .Include(g => g.ChildGroups)
            .Include(g => g.Boxes)
            .ToListAsync();

    public async Task<Group> AddAsync(Group group)
    {
        _context.Groups.Add(group);
        await _context.SaveChangesAsync();
        return group;
    }

    public async Task<Group> UpdateAsync(Group group)
    {
        _context.Groups.Update(group);
        await _context.SaveChangesAsync();
        return group;
    }

    public async Task DeleteAsync(Guid id)
    {
        var group = await GetByIdAsync(id);
        if (group is not null)
        {
            _context.Groups.Remove(group);
            await _context.SaveChangesAsync();
        }
    }
}