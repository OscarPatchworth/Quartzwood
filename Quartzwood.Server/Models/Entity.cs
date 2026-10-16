using System.ComponentModel.DataAnnotations;

namespace Quartzwood.Server.Models;

public enum EntityType
{
    Personal,
    Club,
    Friend,
    Shop
}

public class Entity
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public string Name { get; set; } = string.Empty;
    
    public EntityType Type { get; set; } = EntityType.Personal;
    
    public string? Location { get; set; }
    
    // Navigation
    public ICollection<Group> Groups { get; set; } = new List<Group>();
    public ICollection<EntityMember> Members { get; set; } = new List<EntityMember>();
}