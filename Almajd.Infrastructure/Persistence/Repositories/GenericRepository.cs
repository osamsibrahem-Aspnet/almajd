using System.Linq.Expressions;
using Almajd.Application.Interfaces;
using Almajd.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Almajd.Infrastructure.Persistence.Repositories;

public class GenericRepository<T> : IGenericRepository<T> where T : BaseEntity
{
    private readonly ApplicationDbContext _db;
    private readonly DbSet<T> _set;

    public GenericRepository(ApplicationDbContext db)
    {
        _db = db;
        _set = db.Set<T>();
    }

    public Task<T?> GetByIdAsync(Guid id) => _set.FirstOrDefaultAsync(e => e.Id == id);

    public async Task<IReadOnlyList<T>> ListAllAsync() => await _set.ToListAsync();

    public async Task<IReadOnlyList<T>> FindAsync(Expression<Func<T, bool>> predicate) =>
        await _set.Where(predicate).ToListAsync();

    public Task<T?> FirstOrDefaultAsync(Expression<Func<T, bool>> predicate) =>
        _set.FirstOrDefaultAsync(predicate);

    public Task<bool> AnyAsync(Expression<Func<T, bool>> predicate) =>
        _set.AnyAsync(predicate);

    public IQueryable<T> Query() => _set.AsQueryable();

    public async Task AddAsync(T entity) => await _set.AddAsync(entity);

    public void Update(T entity) => _set.Update(entity);

    public void SoftDelete(T entity)
    {
        entity.IsDeleted = true;
        _set.Update(entity);
    }
}
