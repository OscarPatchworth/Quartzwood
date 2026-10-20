using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Quartzwood.Server.DTOs;
using Quartzwood.Server.Extensions;
using Quartzwood.Server.Services.Tags;

namespace Quartzwood.Server.Controllers;

[ApiController]
[Authorize]   // every endpoint in this controller requires a logged-in user
[Route("api/tags")]
public class TagsController : ControllerBase
{
    private readonly ITagService _tags;

    public TagsController(ITagService tags)
    {
        _tags = tags;
    }

    // Your own tags: what the tag picker suggests (other people's tags on shared cards aren't listed)
    [HttpGet]
    [ProducesResponseType(typeof(List<TagDto>), 200)]
    public async Task<IActionResult> GetMine()
        => Ok(await _tags.GetMineAsync(User.GetUserId()));
}
