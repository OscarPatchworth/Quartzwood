using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Quartzwood.Server.DTOs;
using Quartzwood.Server.Models;
using Quartzwood.Server.Services.Accounts;

namespace Quartzwood.Server.Controllers;

[ApiController]
[Route("api/account")]
public class AccountController : ControllerBase
{
    private readonly IAccountService _accounts;
    private readonly SignInManager<AppUser> _signIn;

    public AccountController(IAccountService accounts, SignInManager<AppUser> signIn)
    {
        _accounts = accounts;
        _signIn = signIn;
    }

    [HttpPost("register")]
    [ProducesResponseType(typeof(AccountDto), 200)]
    [ProducesResponseType(typeof(ValidationProblemDetails), 400)]
    public async Task<IActionResult> Register(RegisterDto dto)
    {
        var (result, account) = await _accounts.RegisterAsync(dto);

        if (!result.Succeeded)
        {
            // Same error shape as Identity's built-in endpoints: { errors: { PasswordTooShort: [...] } }
            foreach (var error in result.Errors)
                ModelState.AddModelError(error.Code, error.Description);
            return ValidationProblem(ModelState);
        }

        return Ok(account);
    }

    // The currently logged-in user (401 if not logged in)
    [Authorize]
    [HttpGet("me")]
    [ProducesResponseType(typeof(AccountDto), 200)]
    [ProducesResponseType(401)]
    public async Task<IActionResult> Me()
    {
        // The auth cookie stores the user's Id as the NameIdentifier claim
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var account = await _accounts.GetByIdAsync(userId);
        return account is null ? Unauthorized() : Ok(account);
    }

    // Clears the auth cookie
    [Authorize]
    [HttpPost("logout")]
    [ProducesResponseType(204)]
    public async Task<IActionResult> Logout()
    {
        await _signIn.SignOutAsync();
        return NoContent();
    }
}
