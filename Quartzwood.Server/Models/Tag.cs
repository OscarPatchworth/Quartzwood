using System.ComponentModel.DataAnnotations;

namespace Quartzwood.Server.Models;

// A label a user puts on cards ("Trade", "Commander"). Each tag belongs to the user who made it:
// their tag suggestions only list their own, while everyone who can see a card sees all its tags.
// Two users' tags can share a name (Bob's "Ramp" and Alice's "Ramp" are different rows)
public class Tag
{
    public const int MaxNameLength = 40;

    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    // Unique per owner, ignoring case (see AppDbContext)
    [Required]
    [MaxLength(MaxNameLength)]
    public string Name { get; set; } = string.Empty;

    public Guid OwnerId { get; set; }
    public AppUser Owner { get; set; } = null!;

    // Navigation
    public ICollection<CardTag> CardTags { get; set; } = new List<CardTag>();
}