using System.Security.Claims;

namespace Quartzwood.Server.Extensions;

public static class ClaimsPrincipalExtensions
{
    // The auth cookie stores the user's Id as the NameIdentifier claim.
    // Only call this where [Authorize] guarantees someone is logged in
    public static Guid GetUserId(this ClaimsPrincipal user)
        => Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("No logged-in user."));
}
