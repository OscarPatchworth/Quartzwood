using Microsoft.AspNetCore.Mvc;
using Quartzwood.Server.DTOs;
using Quartzwood.Server.Services.Accounts;

namespace Quartzwood.Server.Controllers;

[ApiController]
[Route("api/account")]
public class AccountController : ControllerBase
{
    private readonly IAccountService _accounts;

    public AccountController(IAccountService accounts)
    {
        _accounts = accounts;
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
}
