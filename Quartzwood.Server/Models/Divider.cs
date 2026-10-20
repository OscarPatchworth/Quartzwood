using System.ComponentModel.DataAnnotations;

namespace Quartzwood.Server.Models;

// A named section inside a box, like a physical divider card. Cards behind it point at it with DividerId
public class Divider
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public string Name { get; set; } = string.Empty;

    // Front of the box first: 0, 1, 2, ...
    public int SortOrder { get; set; }

    public Guid BoxId { get; set; }
    public Box Box { get; set; } = null!;

    // Navigation
    public ICollection<CardInstance> Cards { get; set; } = new List<CardInstance>();
}
