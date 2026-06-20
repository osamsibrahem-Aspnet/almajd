using Microsoft.AspNetCore.Http;

namespace Almajd.Application.Interfaces;

public interface IFileOperations
{
    Task<string> SaveAsync(IFormFile file, string subfolder);
    void Delete(string relativePath);
}
