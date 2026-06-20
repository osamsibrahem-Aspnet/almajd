using Almajd.Application.Common;
using Almajd.Application.DTOs.Sales;
using Almajd.Application.Interfaces;
using Almajd.Domain.Entities;
using AutoMapper;
using Microsoft.EntityFrameworkCore;

namespace Almajd.Application.Services;

public class CouponService : ICouponService
{
    private readonly IUnitOfWork _uow;
    private readonly IMapper _mapper;

    public CouponService(IUnitOfWork uow, IMapper mapper)
    {
        _uow = uow;
        _mapper = mapper;
    }

    public async Task<ApiResponse<IReadOnlyList<CouponDto>>> ListAsync(bool includeInactive = false)
    {
        var query = _uow.Repository<DiscountCoupon>().Query();
        if (!includeInactive) query = query.Where(c => c.IsActive);

        var items = await query.OrderByDescending(c => c.CreatedAt).ToListAsync();
        return ApiResponse<IReadOnlyList<CouponDto>>.Ok(items.Select(_mapper.Map<CouponDto>).ToList());
    }

    public async Task<ApiResponse<CouponDto>> GetByCodeAsync(string code)
    {
        var normalized = code.Trim().ToUpperInvariant();
        var c = await _uow.Repository<DiscountCoupon>().FirstOrDefaultAsync(x => x.Code == normalized);
        return c is null
            ? ApiResponse<CouponDto>.Fail(404, "Coupon not found.")
            : ApiResponse<CouponDto>.Ok(_mapper.Map<CouponDto>(c));
    }

    public async Task<ApiResponse<CouponDto>> CreateAsync(CouponCreateDto dto)
    {
        var code = dto.Code.Trim().ToUpperInvariant();
        if (await _uow.Repository<DiscountCoupon>().AnyAsync(c => c.Code == code))
            return ApiResponse<CouponDto>.Fail(409, "A coupon with this code already exists.");

        var coupon = new DiscountCoupon
        {
            Code = code,
            Description = dto.Description,
            Type = dto.Type,
            Value = dto.Value,
            ValidFrom = dto.ValidFrom,
            ValidTo = dto.ValidTo,
            UsageCap = dto.UsageCap,
            UsageCount = 0,
            IsActive = true
        };

        await _uow.Repository<DiscountCoupon>().AddAsync(coupon);
        await _uow.CompleteAsync();

        return ApiResponse<CouponDto>.Created(_mapper.Map<CouponDto>(coupon));
    }

    public async Task<ApiResponse<CouponDto>> UpdateAsync(Guid id, CouponUpdateDto dto)
    {
        var coupon = await _uow.Repository<DiscountCoupon>().GetByIdAsync(id);
        if (coupon is null) return ApiResponse<CouponDto>.Fail(404, "Coupon not found.");

        var newCode = dto.Code.Trim().ToUpperInvariant();
        if (newCode != coupon.Code && await _uow.Repository<DiscountCoupon>().AnyAsync(c => c.Code == newCode && c.Id != id))
            return ApiResponse<CouponDto>.Fail(409, "Another coupon already uses this code.");

        coupon.Code = newCode;
        coupon.Description = dto.Description;
        coupon.Type = dto.Type;
        coupon.Value = dto.Value;
        coupon.ValidFrom = dto.ValidFrom;
        coupon.ValidTo = dto.ValidTo;
        coupon.UsageCap = dto.UsageCap;
        coupon.IsActive = dto.IsActive;

        _uow.Repository<DiscountCoupon>().Update(coupon);
        await _uow.CompleteAsync();
        return ApiResponse<CouponDto>.Ok(_mapper.Map<CouponDto>(coupon));
    }

    public async Task<ApiResponse> DeleteAsync(Guid id)
    {
        var coupon = await _uow.Repository<DiscountCoupon>().GetByIdAsync(id);
        if (coupon is null) return ApiResponse.Fail(404, "Coupon not found.");

        _uow.Repository<DiscountCoupon>().SoftDelete(coupon);
        await _uow.CompleteAsync();
        return ApiResponse.Ok("Coupon deleted.");
    }
}
