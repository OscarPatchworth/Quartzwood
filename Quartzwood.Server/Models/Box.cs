using System.ComponentModel.DataAnnotations;

namespace Quartzwood.Server.Models;

public class Box
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public string Name { get; set; } = string.Empty;
    
    public Guid GroupId { get; set; }
    public Group Group { get; set; } = null!;

    // null = same as the group it's in (see Visibility)
    public Visibility? Visibility { get; set; }

    // Navigation
    public ICollection<CardInstance> Cards { get; set; } = new List<CardInstance>();
    public ICollection<Divider> Dividers { get; set; } = new List<Divider>();
}