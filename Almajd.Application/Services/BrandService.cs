using Almajd.Application.Common;
using Almajd.Application.DTOs.Catalog;
using Almajd.Application.Interfaces;
using Almajd.Domain.Entities;
using AutoMapper;
using Microsoft.EntityFrameworkCore;

namespace Almajd.Application.Services;

public class BrandService : IBrandService
{
    private readonly IUnitOfWork _uow;
    private readonly IMapper _mapper;

    public BrandService(IUnitOfWork uow, IMapper mapper)
    {
        _uow = uow;
        _mapper = mapper;
    }

    public async Task<ApiResponse<IReadOnlyList<BrandDto>>> ListAsync(bool includeInactive = false)
    {
        var query = _uow.Repository<Brand>().Query();
        if (!includeInactive) query = query.Where(b => b.IsActive);

        var items = await query.OrderBy(b => b.Name).ToListAsync();
        return ApiResponse<IReadOnlyList<BrandDto>>.Ok(items.Select(_mapper.Map<BrandDto>).ToList());
    }

    public async Task<ApiResponse<BrandDto>> GetAsync(Guid id)
    {
        var brand = await _uow.Repository<Brand>().GetByIdAsync(id);
        return brand is null
            ? ApiResponse<BrandDto>.Fail(404, "Brand not found.")
            : ApiResponse<BrandDto>.Ok(_mapper.Map<BrandDto>(brand));
    }

    public async Task<ApiResponse<BrandDto>> CreateAsync(BrandCreateDto dto)
    {
        var slug = Slugger.ToSlug(dto.Name);
        if (await _uow.Repository<Brand>().AnyAsync(b => b.Slug == slug))
            return ApiResponse<BrandDto>.Fail(409, "A brand with this name already exists.");

        var brand = new Brand
        {
            Name = dto.Name.Trim(),
            Slug = slug,
            LogoPath = dto.LogoPath,
            IsActive = true
        };

        await _uow.Repository<Brand>().AddAsync(brand);
        await _uow.CompleteAsync();

        return ApiResponse<BrandDto>.Created(_mapper.Map<BrandDto>(brand));
    }

    public async Task<ApiResponse<BrandDto>> UpdateAsync(Guid id, BrandUpdateDto dto)
    {
        var brand = await _uow.Repository<Brand>().GetByIdAsync(id);
        if (brand is null) return ApiResponse<BrandDto>.Fail(404, "Brand not found.");

        var newSlug = Slugger.ToSlug(dto.Name);
        if (newSlug != brand.Slug &&
            await _uow.Repository<Brand>().AnyAsync(b => b.Slug == newSlug && b.Id != id))
            return ApiResponse<BrandDto>.Fail(409, "Another brand already uses this name.");

        brand.Name = dto.Name.Trim();
        brand.Slug = newSlug;
        brand.LogoPath = dto.LogoPath;
        brand.IsActive = dto.IsActive;

        _uow.Repository<Brand>().Update(brand);
        await _uow.CompleteAsync();

        return ApiResponse<BrandDto>.Ok(_mapper.Map<BrandDto>(brand));
    }

    public async Task<ApiResponse> DeleteAsync(Guid id)
    {
        var brand = await _uow.Repository<Brand>().GetByIdAsync(id);
        if (brand is null) return ApiResponse.Fail(404, "Brand not found.");

        if (await _uow.Repository<Product>().AnyAsync(p => p.BrandId == id))
            return ApiResponse.Fail(409, "Brand has products and cannot be deleted. Deactivate it instead.");

        _uow.Repository<Brand>().SoftDelete(brand);
        await _uow.CompleteAsync();
        return ApiResponse.Ok("Brand deleted.");
    }
}
