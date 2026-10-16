namespace Quartzwood.Server.Models;

public enum EntityRole
{
    Owner,
    Editor,
    Viewer
}

// Join table: which users belong to which entities, and what they're allowed to do there
public class EntityMember
{
    public Guid EntityId { get; set; }
    public Entity Entity { get; set; } = null!;

    public Guid UserId { get; set; }
    public AppUser User { get; set; } = null!;

    public EntityRole Role { get; set; } = EntityRole.Viewer;
}
