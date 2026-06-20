using System.Collections.Concurrent;
using Almajd.Application.Interfaces;
using Almajd.Domain.Entities;

namespace Almajd.Infrastructure.Persistence.Repositories;

public class UnitOfWork : IUnitOfWork
{
    private readonly ApplicationDbContext _db;
    private readonly ConcurrentDictionary<Type, object> _repositories = new();

    public UnitOfWork(ApplicationDbContext db) => _db = db;

    public IGenericRepository<T> Repository<T>() where T : BaseEntity =>
        (IGenericRepository<T>)_repositories.GetOrAdd(typeof(T), _ => new GenericRepository<T>(_db));

    public Task<int> CompleteAsync() => _db.SaveChangesAsync();

    public async ValueTask DisposeAsync() => await _db.DisposeAsync();
}
