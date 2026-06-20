using Almajd.Domain.Entities;

namespace Almajd.Application.Interfaces;

public interface IUnitOfWork : IAsyncDisposable
{
    IGenericRepository<T> Repository<T>() where T : BaseEntity;
    Task<int> CompleteAsync();
}
