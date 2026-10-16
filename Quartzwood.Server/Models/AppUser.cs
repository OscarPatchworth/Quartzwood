using Microsoft.AspNetCore.Identity;

namespace Quartzwood.Server.Models;

// Id, Email, UserName, PasswordHash, SecurityStamp, lockout etc. come from IdentityUser
public class AppUser : IdentityUser<Guid>
{
    public string DisplayName { get; set; } = string.Empty;

    // Navigation
    public ICollection<EntityMember> Memberships { get; set; } = new List<EntityMember>();
}
