using Almajd.Application.Common;
using Almajd.Application.DTOs.Files;
using Almajd.Application.Interfaces;
using Almajd.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Almajd.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class FilesController : ControllerBase
{
    private static readonly HashSet<string> AllowedSubfolders =
        new(StringComparer.OrdinalIgnoreCase) { "BrandLogos", "CategoryImages", "ProfileImages" };

    private readonly IFileOperations _files;
    private readonly ILogger<FilesController> _logger;

    public FilesController(IFileOperations files, ILogger<FilesController> logger)
    {
        _files = files;
        _logger = logger;
    }

    [HttpPost("upload")]
    [Authorize(Roles = AppRoles.Admin + "," + AppRoles.SalesRep)]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<IActionResult> Upload([FromForm] IFormFile file, [FromForm] string subfolder)
    {
        if (file is null || file.Length == 0)
            return StatusCode(400, ApiResponse.Fail(400, "File is required."));

        if (string.IsNullOrWhiteSpace(subfolder) || !AllowedSubfolders.Contains(subfolder))
            return StatusCode(400, ApiResponse.Fail(400, "Invalid upload target."));

        try
        {
            var relativeUrl = await _files.SaveAsync(file, subfolder);
            return StatusCode(200, ApiResponse<FileUploadResultDto>.Ok(new FileUploadResultDto(relativeUrl)));
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(400, ApiResponse.Fail(400, ex.Message));
        }
        catch (ArgumentException ex)
        {
            return StatusCode(400, ApiResponse.Fail(400, ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "File upload failed for subfolder {Subfolder}", subfolder);
            return StatusCode(500, ApiResponse.Fail(500, "Upload failed."));
        }
    }
}
