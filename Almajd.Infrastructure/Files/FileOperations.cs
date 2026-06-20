using Almajd.Application.Interfaces;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;

namespace Almajd.Infrastructure.Files;

public class FileOperations : IFileOperations
{
    private static readonly Dictionary<string, HashSet<string>> AllowedExtensions =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["ProductImages"]    = new(StringComparer.OrdinalIgnoreCase) { ".jpg", ".jpeg", ".png", ".webp" },
            ["BrandLogos"]       = new(StringComparer.OrdinalIgnoreCase) { ".jpg", ".jpeg", ".png", ".webp", ".svg" },
            ["CategoryImages"]   = new(StringComparer.OrdinalIgnoreCase) { ".jpg", ".jpeg", ".png", ".webp" },
            ["InvoicePdfs"]      = new(StringComparer.OrdinalIgnoreCase) { ".pdf" },
            ["KycDocuments"]     = new(StringComparer.OrdinalIgnoreCase) { ".pdf", ".jpg", ".jpeg", ".png" },
            ["ReturnPhotos"]     = new(StringComparer.OrdinalIgnoreCase) { ".jpg", ".jpeg", ".png", ".webp" },
            ["ExpenseReceipts"]  = new(StringComparer.OrdinalIgnoreCase) { ".pdf", ".jpg", ".jpeg", ".png" },
            ["ProfileImages"]    = new(StringComparer.OrdinalIgnoreCase) { ".jpg", ".jpeg", ".png", ".webp" }
        };

    private static readonly Dictionary<string, long> MaxSizeBytes =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["ProductImages"]   = 5L * 1024 * 1024,
            ["BrandLogos"]      = 2L * 1024 * 1024,
            ["CategoryImages"]  = 5L * 1024 * 1024,
            ["InvoicePdfs"]     = 10L * 1024 * 1024,
            ["KycDocuments"]    = 10L * 1024 * 1024,
            ["ReturnPhotos"]    = 5L * 1024 * 1024,
            ["ExpenseReceipts"] = 10L * 1024 * 1024,
            ["ProfileImages"]   = 2L * 1024 * 1024,
        };

    private readonly IWebHostEnvironment _env;

    public FileOperations(IWebHostEnvironment env) => _env = env;

    public async Task<string> SaveAsync(IFormFile file, string subfolder)
    {
        if (file is null || file.Length == 0)
            throw new ArgumentException("Empty file.", nameof(file));

        if (!AllowedExtensions.TryGetValue(subfolder, out var allowed))
            throw new ArgumentException($"Unknown subfolder '{subfolder}'.", nameof(subfolder));

        var ext = Path.GetExtension(file.FileName);
        if (!allowed.Contains(ext))
            throw new InvalidOperationException($"Extension '{ext}' is not allowed in '{subfolder}'.");

        if (MaxSizeBytes.TryGetValue(subfolder, out var maxBytes) && file.Length > maxBytes)
            throw new InvalidOperationException(
                $"File exceeds the {maxBytes / (1024 * 1024)} MB limit for '{subfolder}'.");

        var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
        var targetDir = Path.Combine(webRoot, subfolder);
        Directory.CreateDirectory(targetDir);

        var fileName = $"{Guid.NewGuid():N}{ext}";
        var fullPath = Path.Combine(targetDir, fileName);

        await using var stream = File.Create(fullPath);
        await file.CopyToAsync(stream);

        return $"/{subfolder}/{fileName}".Replace('\\', '/');
    }

    public void Delete(string relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath)) return;

        var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
        var trimmed = relativePath.TrimStart('/', '\\').Replace('/', Path.DirectorySeparatorChar);
        var fullPath = Path.Combine(webRoot, trimmed);

        if (File.Exists(fullPath))
            File.Delete(fullPath);
    }
}
