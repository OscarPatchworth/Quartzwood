using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Quartzwood.Server.DTOs;
using Quartzwood.Server.Services.Access;
using Quartzwood.Server.Services.ImportExport;

namespace Quartzwood.Server.Controllers;

// Import/export of cards in other apps' formats: plain text list, Moxfield/Deckbox CSV, ManaBox CSV
[ApiController]
[Authorize]   // every endpoint in this controller requires a logged-in user
[Route("api")]
public class ImportExportController : ControllerBase
{
    // ~2MB of text: tens of thousands of lines, enough for a big collection
    private const int MaxImportLength = 2_000_000;

    private readonly CollectionTransferService _transfer;
    private readonly IAccessService _access;

    public ImportExportController(CollectionTransferService transfer, IAccessService access)
    {
        _transfer = transfer;
        _access = access;
    }

    [HttpGet("export/formats")]
    [ProducesResponseType(typeof(IEnumerable<TransferFormatDto>), 200)]
    public IActionResult GetFormats()
        => Ok(CollectionTransferService.Formats.Select(f => new TransferFormatDto(f.Key, f.DisplayName)));

    // A group and everything inside it (use the root group for the whole collection), as a file download
    [HttpGet("export/groups/{id}")]
    [ProducesResponseType(typeof(FileContentResult), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> ExportGroup(Guid id, [FromQuery] string format = "text")
    {
        if (!await _access.CanAccessGroupAsync(id)) return NotFound();
        var transferFormat = CollectionTransferService.FindFormat(format);
        if (transferFormat is null) return BadRequest($"Unknown format \"{format}\".");

        var file = await _transfer.ExportGroupAsync(id, transferFormat);
        return file is null ? NotFound() : File(file.Content, file.ContentType, file.FileName);
    }

    [HttpGet("export/boxes/{id}")]
    [ProducesResponseType(typeof(FileContentResult), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> ExportBox(Guid id, [FromQuery] string format = "text")
    {
        if (!await _access.CanAccessBoxAsync(id)) return NotFound();
        var transferFormat = CollectionTransferService.FindFormat(format);
        if (transferFormat is null) return BadRequest($"Unknown format \"{format}\".");

        var file = await _transfer.ExportBoxAsync(id, transferFormat);
        return file is null ? NotFound() : File(file.Content, file.ContentType, file.FileName);
    }

    // Adds the cards in the file to the box. The format is detected from the first line
    [HttpPost("import/boxes/{id}")]
    [ProducesResponseType(typeof(ImportResultDto), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> ImportIntoBox(Guid id, ImportRequestDto dto)
    {
        if (!await _access.CanAccessBoxAsync(id)) return NotFound();
        if (string.IsNullOrWhiteSpace(dto.Content)) return BadRequest("Nothing to import.");
        if (dto.Content.Length > MaxImportLength) return BadRequest("That file is too big to import in one go: split it up.");

        return Ok(await _transfer.ImportAsync(id, dto.Content));
    }
}
