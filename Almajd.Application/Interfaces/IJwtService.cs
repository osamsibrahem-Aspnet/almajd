using Almajd.Domain.Entities;

namespace Almajd.Application.Interfaces;

public interface IJwtService
{
    Task<string> CreateTokenAsync(ApplicationUser user);
}
