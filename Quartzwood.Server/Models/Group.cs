using System.ComponentModel.DataAnnotations;

namespace Quartzwood.Server.Models;

public class Group
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public string Name { get; set; } = string.Empty;
    
    public string? Description { get; set; }
    
    // Every group (root or nested) stores the Entity that owns it, so access checks are one lookup
    public Guid EntityId { get; set; }
    public Entity Entity { get; set; } = null!;

    // null = root group of its Entity
    public Guid? ParentGroupId { get; set; }
    public Group? ParentGroup { get; set; }

    // null = same as the parent group (see Visibility)
    public Visibility? Visibility { get; set; }

    // Navigation
    public ICollection<Group> ChildGroups { get; set; } = new List<Group>();
    public ICollection<Box> Boxes { get; set; } = new List<Box>();
}