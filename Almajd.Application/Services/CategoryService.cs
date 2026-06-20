using Almajd.Application.Common;
using Almajd.Application.DTOs.Catalog;
using Almajd.Application.Interfaces;
using Almajd.Domain.Entities;
using AutoMapper;
using Microsoft.EntityFrameworkCore;

namespace Almajd.Application.Services;

public class CategoryService : ICategoryService
{
    private readonly IUnitOfWork _uow;
    private readonly IMapper _mapper;

    public CategoryService(IUnitOfWork uow, IMapper mapper)
    {
        _uow = uow;
        _mapper = mapper;
    }

    public async Task<ApiResponse<IReadOnlyList<CategoryDto>>> ListAsync(bool includeInactive = false)
    {
        var query = _uow.Repository<Category>().Query();
        if (!includeInactive) query = query.Where(c => c.IsActive);

        var items = await query.OrderBy(c => c.SortOrder).ThenBy(c => c.Name).ToListAsync();
        return ApiResponse<IReadOnlyList<CategoryDto>>.Ok(items.Select(_mapper.Map<CategoryDto>).ToList());
    }

    public async Task<ApiResponse<IReadOnlyList<CategoryTreeNodeDto>>> ListTreeAsync(bool includeInactive = false)
    {
        var query = _uow.Repository<Category>().Query();
        if (!includeInactive) query = query.Where(c => c.IsActive);

        var all = await query.OrderBy(c => c.SortOrder).ThenBy(c => c.Name).ToListAsync();

        var nodes = all.ToDictionary(c => c.Id, c =>
        {
            var dto = _mapper.Map<CategoryTreeNodeDto>(c);
            dto.Children = new List<CategoryTreeNodeDto>();
            return dto;
        });

        var roots = new List<CategoryTreeNodeDto>();

        foreach (var cat in all)
        {
            var node = nodes[cat.Id];
            if (cat.ParentId.HasValue && nodes.TryGetValue(cat.ParentId.Value, out var parent))
            {
                ((List<CategoryTreeNodeDto>)parent.Children).Add(node);
            }
            else
            {
                roots.Add(node);
            }
        }

        return ApiResponse<IReadOnlyList<CategoryTreeNodeDto>>.Ok(roots);
    }

    public async Task<ApiResponse<CategoryDto>> GetAsync(Guid id)
    {
        var c = await _uow.Repository<Category>().GetByIdAsync(id);
        return c is null
            ? ApiResponse<CategoryDto>.Fail(404, "Category not found.")
            : ApiResponse<CategoryDto>.Ok(_mapper.Map<CategoryDto>(c));
    }

    public async Task<ApiResponse<CategoryDto>> CreateAsync(CategoryCreateDto dto)
    {
        var slug = Slugger.ToSlug(dto.Name);
        if (await _uow.Repository<Category>().AnyAsync(c => c.Slug == slug))
            return ApiResponse<CategoryDto>.Fail(409, "A category with this name already exists.");

        if (dto.ParentId.HasValue && !await _uow.Repository<Category>().AnyAsync(c => c.Id == dto.ParentId))
            return ApiResponse<CategoryDto>.Fail(400, "Parent category not found.");

        var category = new Category
        {
            ParentId = dto.ParentId,
            Name = dto.Name.Trim(),
            Slug = slug,
            Description = dto.Description,
            SortOrder = dto.SortOrder,
            AttributeSchemaJson = dto.AttributeSchemaJson,
            IsActive = true
        };

        await _uow.Repository<Category>().AddAsync(category);
        await _uow.CompleteAsync();

        return ApiResponse<CategoryDto>.Created(_mapper.Map<CategoryDto>(category));
    }

    public async Task<ApiResponse<CategoryDto>> UpdateAsync(Guid id, CategoryUpdateDto dto)
    {
        var category = await _uow.Repository<Category>().GetByIdAsync(id);
        if (category is null) return ApiResponse<CategoryDto>.Fail(404, "Category not found.");

        if (dto.ParentId == id)
            return ApiResponse<CategoryDto>.Fail(400, "A category cannot be its own parent.");

        if (dto.ParentId.HasValue && !await _uow.Repository<Category>().AnyAsync(c => c.Id == dto.ParentId))
            return ApiResponse<CategoryDto>.Fail(400, "Parent category not found.");

        var newSlug = Slugger.ToSlug(dto.Name);
        if (newSlug != category.Slug &&
            await _uow.Repository<Category>().AnyAsync(c => c.Slug == newSlug && c.Id != id))
            return ApiResponse<CategoryDto>.Fail(409, "Another category already uses this name.");

        category.ParentId = dto.ParentId;
        category.Name = dto.Name.Trim();
        category.Slug = newSlug;
        category.Description = dto.Description;
        category.SortOrder = dto.SortOrder;
        category.AttributeSchemaJson = dto.AttributeSchemaJson;
        category.IsActive = dto.IsActive;

        _uow.Repository<Category>().Update(category);
        await _uow.CompleteAsync();

        return ApiResponse<CategoryDto>.Ok(_mapper.Map<CategoryDto>(category));
    }

    public async Task<ApiResponse> DeleteAsync(Guid id)
    {
        var category = await _uow.Repository<Category>().GetByIdAsync(id);
        if (category is null) return ApiResponse.Fail(404, "Category not found.");

        if (await _uow.Repository<Category>().AnyAsync(c => c.ParentId == id))
            return ApiResponse.Fail(409, "Category has children. Move or delete them first.");

        if (await _uow.Repository<Product>().AnyAsync(p => p.CategoryId == id))
            return ApiResponse.Fail(409, "Category has products. Move them first.");

        _uow.Repository<Category>().SoftDelete(category);
        await _uow.CompleteAsync();
        return ApiResponse.Ok("Category deleted.");
    }
}
