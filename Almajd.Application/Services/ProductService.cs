using System.Globalization;
using Almajd.Application.Common;
using Almajd.Application.DTOs.Catalog;
using Almajd.Application.Interfaces;
using Almajd.Domain.Entities;
using Almajd.Domain.Enums;
using AutoMapper;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Almajd.Application.Services;

public class ProductService : IProductService
{
    private readonly IUnitOfWork _uow;
    private readonly IMapper _mapper;
    private readonly IFileOperations _files;

    public ProductService(IUnitOfWork uow, IMapper mapper, IFileOperations files)
    {
        _uow = uow;
        _mapper = mapper;
        _files = files;
    }

    public async Task<ApiResponse<PagedResult<ProductListItemDto>>> SearchAsync(ProductSearchQuery q)
    {
        var page = Math.Max(q.Page, 1);
        var pageSize = Math.Clamp(q.PageSize, 1, 100);

        var query = _uow.Repository<Product>().Query()
            .Include(p => p.Brand)
            .Include(p => p.Category)
            .Include(p => p.Skus)
            .Include(p => p.Media)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var term = $"%{q.Search.Trim()}%";
            query = query.Where(p =>
                EF.Functions.Like(p.Name, term) ||
                EF.Functions.Like(p.Brand.Name, term) ||
                p.Skus.Any(s => EF.Functions.Like(s.Code, term) || EF.Functions.Like(s.Barcode, term)));
        }

        if (q.BrandId.HasValue) query = query.Where(p => p.BrandId == q.BrandId);
        if (q.CategoryId.HasValue) query = query.Where(p => p.CategoryId == q.CategoryId);
        if (q.Status.HasValue) query = query.Where(p => p.Status == q.Status);
        if (q.IsFeatured.HasValue) query = query.Where(p => p.IsFeatured == q.IsFeatured);

        query = q.Sort switch
        {
            "name-desc" => query.OrderByDescending(p => p.Name),
            "recent" => query.OrderByDescending(p => p.CreatedAt),
            _ => query.OrderBy(p => p.Name)
        };

        var total = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return ApiResponse<PagedResult<ProductListItemDto>>.Ok(new PagedResult<ProductListItemDto>
        {
            Items = items.Select(_mapper.Map<ProductListItemDto>).ToList(),
            Total = total,
            Page = page,
            PageSize = pageSize
        });
    }

    public async Task<ApiResponse<ProductDto>> GetAsync(Guid id)
    {
        var p = await LoadDetailQuery().FirstOrDefaultAsync(x => x.Id == id);
        return p is null
            ? ApiResponse<ProductDto>.Fail(404, "Product not found.")
            : ApiResponse<ProductDto>.Ok(_mapper.Map<ProductDto>(p));
    }

    public async Task<ApiResponse<ProductDto>> GetBySlugAsync(string slug)
    {
        var p = await LoadDetailQuery().FirstOrDefaultAsync(x => x.Slug == slug);
        return p is null
            ? ApiResponse<ProductDto>.Fail(404, "Product not found.")
            : ApiResponse<ProductDto>.Ok(_mapper.Map<ProductDto>(p));
    }

    public async Task<ApiResponse<ProductDto>> CreateAsync(ProductCreateDto dto)
    {
        if (!await _uow.Repository<Brand>().AnyAsync(b => b.Id == dto.BrandId))
            return ApiResponse<ProductDto>.Fail(400, "Brand not found.");

        if (dto.CategoryId.HasValue && !await _uow.Repository<Category>().AnyAsync(c => c.Id == dto.CategoryId))
            return ApiResponse<ProductDto>.Fail(400, "Category not found.");

        var slug = await UniqueSlugAsync(dto.Name);

        var product = new Product
        {
            BrandId = dto.BrandId,
            CategoryId = dto.CategoryId,
            Name = dto.Name.Trim(),
            Slug = slug,
            Description = dto.Description,
            Status = dto.Status,
            IsFeatured = dto.IsFeatured
        };

        await _uow.Repository<Product>().AddAsync(product);
        await _uow.CompleteAsync();

        return await GetAsync(product.Id) is { IsSuccess: true } loaded
            ? ApiResponse<ProductDto>.Created(loaded.Data!)
            : ApiResponse<ProductDto>.Fail(500, "Created but failed to reload.");
    }

    public async Task<ApiResponse<ProductDto>> UpdateAsync(Guid id, ProductUpdateDto dto)
    {
        var product = await _uow.Repository<Product>().GetByIdAsync(id);
        if (product is null) return ApiResponse<ProductDto>.Fail(404, "Product not found.");

        if (!await _uow.Repository<Brand>().AnyAsync(b => b.Id == dto.BrandId))
            return ApiResponse<ProductDto>.Fail(400, "Brand not found.");

        if (dto.CategoryId.HasValue && !await _uow.Repository<Category>().AnyAsync(c => c.Id == dto.CategoryId))
            return ApiResponse<ProductDto>.Fail(400, "Category not found.");

        product.BrandId = dto.BrandId;
        product.CategoryId = dto.CategoryId;
        product.Name = dto.Name.Trim();
        product.Description = dto.Description;
        product.Status = dto.Status;
        product.IsFeatured = dto.IsFeatured;

        _uow.Repository<Product>().Update(product);
        await _uow.CompleteAsync();

        return await GetAsync(id);
    }

    public async Task<ApiResponse> DeleteAsync(Guid id)
    {
        var product = await _uow.Repository<Product>().GetByIdAsync(id);
        if (product is null) return ApiResponse.Fail(404, "Product not found.");

        _uow.Repository<Product>().SoftDelete(product);
        await _uow.CompleteAsync();
        return ApiResponse.Ok("Product deleted.");
    }

    public async Task<ApiResponse<ProductDto>> ChangeStatusAsync(Guid id, ProductStatus status)
    {
        var product = await _uow.Repository<Product>().GetByIdAsync(id);
        if (product is null) return ApiResponse<ProductDto>.Fail(404, "Product not found.");

        product.Status = status;
        _uow.Repository<Product>().Update(product);
        await _uow.CompleteAsync();
        return await GetAsync(id);
    }

    public async Task<ApiResponse<ProductDto>> SetFeaturedAsync(Guid id, bool isFeatured)
    {
        var product = await _uow.Repository<Product>().GetByIdAsync(id);
        if (product is null) return ApiResponse<ProductDto>.Fail(404, "Product not found.");

        product.IsFeatured = isFeatured;
        _uow.Repository<Product>().Update(product);
        await _uow.CompleteAsync();
        return await GetAsync(id);
    }

    public async Task<ApiResponse<SkuDto>> AddSkuAsync(SkuCreateDto dto)
    {
        if (!await _uow.Repository<Product>().AnyAsync(p => p.Id == dto.ProductId))
            return ApiResponse<SkuDto>.Fail(400, "Product not found.");

        if (await _uow.Repository<Sku>().AnyAsync(s => s.Code == dto.Code))
            return ApiResponse<SkuDto>.Fail(409, "SKU code already in use.");

        if (await _uow.Repository<Sku>().AnyAsync(s => s.Barcode == dto.Barcode))
            return ApiResponse<SkuDto>.Fail(409, "Barcode already in use.");

        var sku = new Sku
        {
            ProductId = dto.ProductId,
            Code = dto.Code.Trim(),
            Barcode = dto.Barcode.Trim(),
            AttributesJson = dto.AttributesJson,
            WeightG = dto.WeightG,
            IsActive = true
        };

        await _uow.Repository<Sku>().AddAsync(sku);
        await _uow.CompleteAsync();

        return ApiResponse<SkuDto>.Created(_mapper.Map<SkuDto>(sku));
    }

    public async Task<ApiResponse<SkuDto>> UpdateSkuAsync(Guid skuId, SkuUpdateDto dto)
    {
        var sku = await _uow.Repository<Sku>().GetByIdAsync(skuId);
        if (sku is null) return ApiResponse<SkuDto>.Fail(404, "SKU not found.");

        if (sku.Code != dto.Code && await _uow.Repository<Sku>().AnyAsync(s => s.Code == dto.Code && s.Id != skuId))
            return ApiResponse<SkuDto>.Fail(409, "SKU code already in use.");

        if (sku.Barcode != dto.Barcode && await _uow.Repository<Sku>().AnyAsync(s => s.Barcode == dto.Barcode && s.Id != skuId))
            return ApiResponse<SkuDto>.Fail(409, "Barcode already in use.");

        sku.Code = dto.Code.Trim();
        sku.Barcode = dto.Barcode.Trim();
        sku.AttributesJson = dto.AttributesJson;
        sku.WeightG = dto.WeightG;
        sku.IsActive = dto.IsActive;

        _uow.Repository<Sku>().Update(sku);
        await _uow.CompleteAsync();

        return ApiResponse<SkuDto>.Ok(_mapper.Map<SkuDto>(sku));
    }

    public async Task<ApiResponse> RemoveSkuAsync(Guid skuId)
    {
        var sku = await _uow.Repository<Sku>().GetByIdAsync(skuId);
        if (sku is null) return ApiResponse.Fail(404, "SKU not found.");

        _uow.Repository<Sku>().SoftDelete(sku);
        await _uow.CompleteAsync();
        return ApiResponse.Ok("SKU removed.");
    }

    public async Task<ApiResponse<ProductMediaDto>> AddMediaAsync(Guid productId, IFormFile file)
    {
        var product = await _uow.Repository<Product>().GetByIdAsync(productId);
        if (product is null) return ApiResponse<ProductMediaDto>.Fail(404, "Product not found.");

        string url;
        try
        {
            url = await _files.SaveAsync(file, "ProductImages");
        }
        catch (Exception ex)
        {
            return ApiResponse<ProductMediaDto>.Fail(400, ex.Message);
        }

        var existing = await _uow.Repository<ProductMedia>().FindAsync(m => m.ProductId == productId);
        var sortOrder = existing.Count == 0 ? 0 : existing.Max(m => m.SortOrder) + 1;

        var media = new ProductMedia
        {
            ProductId = productId,
            Url = url,
            Kind = MediaKind.Image,
            SortOrder = sortOrder
        };

        await _uow.Repository<ProductMedia>().AddAsync(media);
        await _uow.CompleteAsync();

        return ApiResponse<ProductMediaDto>.Created(_mapper.Map<ProductMediaDto>(media));
    }

    public async Task<ApiResponse> RemoveMediaAsync(Guid mediaId)
    {
        var media = await _uow.Repository<ProductMedia>().GetByIdAsync(mediaId);
        if (media is null) return ApiResponse.Fail(404, "Media not found.");

        _files.Delete(media.Url);
        _uow.Repository<ProductMedia>().SoftDelete(media);
        await _uow.CompleteAsync();
        return ApiResponse.Ok("Media removed.");
    }

    public async Task<ApiResponse<BulkImportResultDto>> BulkImportAsync(IFormFile csvFile)
    {
        if (csvFile is null || csvFile.Length == 0)
            return ApiResponse<BulkImportResultDto>.Fail(400, "CSV file is required.");

        var errors = new List<BulkImportRowErrorDto>();
        var imported = 0;
        var skipped = 0;
        var rowNum = 0;

        using var reader = new StreamReader(csvFile.OpenReadStream());
        var headerLine = await reader.ReadLineAsync();
        if (headerLine is null)
            return ApiResponse<BulkImportResultDto>.Fail(400, "Empty CSV.");

        var header = ParseCsvLine(headerLine).Select(h => h.Trim().ToLowerInvariant()).ToList();
        int IndexOf(string name) => header.IndexOf(name);

        var iBrand = IndexOf("brandname");
        var iCategory = IndexOf("categoryslug");
        var iProduct = IndexOf("productname");
        var iSku = IndexOf("skucode");
        var iBarcode = IndexOf("barcode");
        var iWeight = IndexOf("weightg");

        if (iBrand < 0 || iProduct < 0 || iSku < 0 || iBarcode < 0)
            return ApiResponse<BulkImportResultDto>.Fail(400,
                "CSV must include columns: BrandName, ProductName, SkuCode, Barcode (CategorySlug, WeightG optional).");

        var brandCache = (await _uow.Repository<Brand>().ListAllAsync())
            .ToDictionary(b => b.Name.Trim(), b => b, StringComparer.OrdinalIgnoreCase);
        var categoryCache = (await _uow.Repository<Category>().ListAllAsync())
            .ToDictionary(c => c.Slug, c => c, StringComparer.OrdinalIgnoreCase);
        var existingSkuCodes = (await _uow.Repository<Sku>().ListAllAsync())
            .Select(s => s.Code).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var existingBarcodes = (await _uow.Repository<Sku>().ListAllAsync())
            .Select(s => s.Barcode).ToHashSet(StringComparer.OrdinalIgnoreCase);

        string? line;
        while ((line = await reader.ReadLineAsync()) is not null)
        {
            rowNum++;
            if (string.IsNullOrWhiteSpace(line)) continue;

            var cols = ParseCsvLine(line);

            try
            {
                var brandName = SafeGet(cols, iBrand)?.Trim();
                var productName = SafeGet(cols, iProduct)?.Trim();
                var skuCode = SafeGet(cols, iSku)?.Trim();
                var barcode = SafeGet(cols, iBarcode)?.Trim();
                var categorySlug = iCategory >= 0 ? SafeGet(cols, iCategory)?.Trim() : null;
                var weightStr = iWeight >= 0 ? SafeGet(cols, iWeight)?.Trim() : null;

                if (string.IsNullOrWhiteSpace(brandName) || string.IsNullOrWhiteSpace(productName) ||
                    string.IsNullOrWhiteSpace(skuCode) || string.IsNullOrWhiteSpace(barcode))
                {
                    errors.Add(new BulkImportRowErrorDto { Row = rowNum, Message = "Missing required column." });
                    skipped++;
                    continue;
                }

                if (existingSkuCodes.Contains(skuCode) || existingBarcodes.Contains(barcode))
                {
                    errors.Add(new BulkImportRowErrorDto { Row = rowNum, Message = $"SKU code or barcode '{skuCode}/{barcode}' already exists." });
                    skipped++;
                    continue;
                }

                if (!brandCache.TryGetValue(brandName, out var brand))
                {
                    brand = new Brand { Name = brandName, Slug = Slugger.ToSlug(brandName), IsActive = true };
                    await _uow.Repository<Brand>().AddAsync(brand);
                    brandCache[brandName] = brand;
                }

                Category? category = null;
                if (!string.IsNullOrWhiteSpace(categorySlug))
                {
                    if (!categoryCache.TryGetValue(categorySlug, out category))
                    {
                        errors.Add(new BulkImportRowErrorDto { Row = rowNum, Message = $"Unknown category slug '{categorySlug}'." });
                        skipped++;
                        continue;
                    }
                }

                var weight = 0;
                if (!string.IsNullOrWhiteSpace(weightStr) &&
                    !int.TryParse(weightStr, NumberStyles.Integer, CultureInfo.InvariantCulture, out weight))
                {
                    errors.Add(new BulkImportRowErrorDto { Row = rowNum, Message = $"Invalid weight '{weightStr}'." });
                    skipped++;
                    continue;
                }

                var slug = await UniqueSlugAsync(productName);
                var product = new Product
                {
                    Brand = brand,
                    Category = category,
                    Name = productName,
                    Slug = slug,
                    Status = ProductStatus.Draft
                };

                product.Skus.Add(new Sku
                {
                    Code = skuCode,
                    Barcode = barcode,
                    WeightG = weight,
                    IsActive = true
                });

                await _uow.Repository<Product>().AddAsync(product);
                existingSkuCodes.Add(skuCode);
                existingBarcodes.Add(barcode);
                imported++;
            }
            catch (Exception ex)
            {
                errors.Add(new BulkImportRowErrorDto { Row = rowNum, Message = ex.Message });
                skipped++;
            }
        }

        await _uow.CompleteAsync();

        return ApiResponse<BulkImportResultDto>.Ok(new BulkImportResultDto
        {
            TotalRows = rowNum,
            Imported = imported,
            Skipped = skipped,
            Errors = errors
        });
    }

    private IQueryable<Product> LoadDetailQuery() =>
        _uow.Repository<Product>().Query()
            .Include(p => p.Brand)
            .Include(p => p.Category)
            .Include(p => p.Skus)
            .Include(p => p.Media);

    private async Task<string> UniqueSlugAsync(string name)
    {
        var baseSlug = Slugger.ToSlug(name);
        if (string.IsNullOrWhiteSpace(baseSlug)) baseSlug = Guid.NewGuid().ToString("N")[..8];

        var slug = baseSlug;
        var suffix = 1;
        while (await _uow.Repository<Product>().AnyAsync(p => p.Slug == slug))
        {
            suffix++;
            slug = $"{baseSlug}-{suffix}";
        }
        return slug;
    }

    private static List<string> ParseCsvLine(string line)
    {
        var fields = new List<string>();
        var current = new System.Text.StringBuilder();
        var inQuotes = false;

        for (var i = 0; i < line.Length; i++)
        {
            var ch = line[i];
            if (inQuotes)
            {
                if (ch == '"' && i + 1 < line.Length && line[i + 1] == '"')
                {
                    current.Append('"');
                    i++;
                }
                else if (ch == '"') inQuotes = false;
                else current.Append(ch);
            }
            else
            {
                if (ch == ',') { fields.Add(current.ToString()); current.Clear(); }
                else if (ch == '"') inQuotes = true;
                else current.Append(ch);
            }
        }
        fields.Add(current.ToString());
        return fields;
    }

    private static string? SafeGet(IReadOnlyList<string> cols, int index) =>
        index < 0 || index >= cols.Count ? null : cols[index];
}
