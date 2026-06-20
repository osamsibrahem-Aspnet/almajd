using Almajd.Application.Common;
using Almajd.Application.DTOs.Crm;
using Almajd.Application.Interfaces;
using Almajd.Domain.Entities;
using Almajd.Domain.Enums;
using AutoMapper;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Almajd.Application.Services;

public class CustomerService : ICustomerService
{
    private const string KycSubfolder = "KycDocuments";

    private readonly IUnitOfWork _uow;
    private readonly IMapper _mapper;
    private readonly IFileOperations _files;
    private readonly ICurrentUserService _currentUser;

    public CustomerService(IUnitOfWork uow, IMapper mapper, IFileOperations files, ICurrentUserService currentUser)
    {
        _uow = uow;
        _mapper = mapper;
        _files = files;
        _currentUser = currentUser;
    }

    private bool CanCustomerAccess(Guid customerId) =>
        !_currentUser.IsCustomerOnly || _currentUser.CustomerId == customerId;

    public async Task<ApiResponse<PagedResult<CustomerListItemDto>>> SearchAsync(CustomerSearchQuery q)
    {
        var page = Math.Max(q.Page, 1);
        var pageSize = Math.Clamp(q.PageSize, 1, 200);

        IQueryable<Customer> query = _uow.Repository<Customer>().Query()
            .Include(c => c.SalesRep)
            .AsNoTracking();

        // Customer-only callers see only their own record.
        if (_currentUser.IsCustomerOnly)
        {
            if (_currentUser.CustomerId is null)
                return ApiResponse<PagedResult<CustomerListItemDto>>.Fail(403, "Customer profile not linked.");
            query = query.Where(c => c.Id == _currentUser.CustomerId);
        }

        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var term = $"%{q.Search.Trim()}%";
            query = query.Where(c =>
                EF.Functions.Like(c.Code, term) ||
                EF.Functions.Like(c.LegalName, term) ||
                (c.TradeName != null && EF.Functions.Like(c.TradeName, term)) ||
                (c.Phone != null && EF.Functions.Like(c.Phone, term)));
        }

        if (q.Tier.HasValue) query = query.Where(c => c.Tier == q.Tier);
        if (q.Status.HasValue) query = query.Where(c => c.Status == q.Status);
        if (q.SalesRepId.HasValue) query = query.Where(c => c.SalesRepId == q.SalesRepId);

        query = q.Sort switch
        {
            "name-desc" => query.OrderByDescending(c => c.LegalName),
            "ar-desc" => query.OrderByDescending(c => c.CurrentAr),
            "recent" => query.OrderByDescending(c => c.CreatedAt),
            _ => query.OrderBy(c => c.LegalName)
        };

        var total = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync();

        return ApiResponse<PagedResult<CustomerListItemDto>>.Ok(new PagedResult<CustomerListItemDto>
        {
            Items = items.Select(_mapper.Map<CustomerListItemDto>).ToList(),
            Total = total,
            Page = page,
            PageSize = pageSize
        });
    }

    public async Task<ApiResponse<CustomerDto>> GetAsync(Guid id)
    {
        if (!CanCustomerAccess(id)) return ApiResponse<CustomerDto>.Fail(404, "Customer not found.");
        var c = await LoadDetailQuery().FirstOrDefaultAsync(x => x.Id == id);
        return c is null
            ? ApiResponse<CustomerDto>.Fail(404, "Customer not found.")
            : ApiResponse<CustomerDto>.Ok(_mapper.Map<CustomerDto>(c));
    }

    public async Task<ApiResponse<CustomerDto>> GetByCodeAsync(string code)
    {
        var normalized = code.Trim().ToUpperInvariant();
        var c = await LoadDetailQuery().FirstOrDefaultAsync(x => x.Code == normalized);
        if (c is null) return ApiResponse<CustomerDto>.Fail(404, "Customer not found.");
        if (!CanCustomerAccess(c.Id)) return ApiResponse<CustomerDto>.Fail(404, "Customer not found.");
        return ApiResponse<CustomerDto>.Ok(_mapper.Map<CustomerDto>(c));
    }

    public async Task<ApiResponse<CustomerDto>> CreateAsync(CustomerCreateDto dto)
    {
        // SalesRep existence is enforced by FK at INSERT time; ExceptionMiddleware surfaces FK errors as 500.
        var customer = new Customer
        {
            Code = await NextCustomerCodeAsync(),
            LegalName = dto.LegalName.Trim(),
            TradeName = dto.TradeName?.Trim(),
            TaxId = dto.TaxId?.Trim(),
            Phone = dto.Phone?.Trim(),
            Email = dto.Email?.Trim(),
            Tier = dto.Tier,
            Status = CustomerStatus.Active,
            PaymentTermsNetDays = dto.PaymentTermsNetDays,
            CreditLimit = dto.CreditLimit,
            CurrentAr = 0,
            SalesRepId = dto.SalesRepId
        };

        await _uow.Repository<Customer>().AddAsync(customer);
        await _uow.CompleteAsync();

        return await GetAsync(customer.Id) is { IsSuccess: true } loaded
            ? ApiResponse<CustomerDto>.Created(loaded.Data!)
            : ApiResponse<CustomerDto>.Fail(500, "Created but failed to reload.");
    }

    public async Task<ApiResponse<CustomerDto>> UpdateAsync(Guid id, CustomerUpdateDto dto)
    {
        if (!CanCustomerAccess(id)) return ApiResponse<CustomerDto>.Fail(404, "Customer not found.");

        var customer = await _uow.Repository<Customer>().GetByIdAsync(id);
        if (customer is null) return ApiResponse<CustomerDto>.Fail(404, "Customer not found.");

        // Customers cannot self-promote tier/credit/status or change their assigned sales rep.
        if (_currentUser.IsCustomerOnly)
        {
            dto.Tier = customer.Tier;
            dto.Status = customer.Status;
            dto.CreditLimit = customer.CreditLimit;
            dto.SalesRepId = customer.SalesRepId;
        }

        customer.LegalName = dto.LegalName.Trim();
        customer.TradeName = dto.TradeName?.Trim();
        customer.TaxId = dto.TaxId?.Trim();
        customer.Phone = dto.Phone?.Trim();
        customer.Email = dto.Email?.Trim();
        customer.Tier = dto.Tier;
        customer.Status = dto.Status;
        customer.PaymentTermsNetDays = dto.PaymentTermsNetDays;
        customer.CreditLimit = dto.CreditLimit;
        customer.SalesRepId = dto.SalesRepId;

        _uow.Repository<Customer>().Update(customer);
        await _uow.CompleteAsync();

        return await GetAsync(id);
    }

    public async Task<ApiResponse> DeleteAsync(Guid id)
    {
        var customer = await _uow.Repository<Customer>().GetByIdAsync(id);
        if (customer is null) return ApiResponse.Fail(404, "Customer not found.");

        if (customer.CurrentAr != 0)
            return ApiResponse.Fail(409, $"Customer has outstanding AR ({customer.CurrentAr:C}). Settle it before deletion.");

        _uow.Repository<Customer>().SoftDelete(customer);
        await _uow.CompleteAsync();
        return ApiResponse.Ok("Customer deleted.");
    }

    public async Task<ApiResponse<CustomerDto>> SetStatusAsync(Guid id, CustomerStatus status)
    {
        var customer = await _uow.Repository<Customer>().GetByIdAsync(id);
        if (customer is null) return ApiResponse<CustomerDto>.Fail(404, "Customer not found.");

        customer.Status = status;
        _uow.Repository<Customer>().Update(customer);
        await _uow.CompleteAsync();
        return await GetAsync(id);
    }

    public async Task<ApiResponse<CustomerDto>> SetTierAsync(Guid id, CustomerTier tier)
    {
        var customer = await _uow.Repository<Customer>().GetByIdAsync(id);
        if (customer is null) return ApiResponse<CustomerDto>.Fail(404, "Customer not found.");

        customer.Tier = tier;
        _uow.Repository<Customer>().Update(customer);
        await _uow.CompleteAsync();
        return await GetAsync(id);
    }

    public async Task<ApiResponse<CustomerDto>> UploadKycAsync(Guid id, IFormFile file)
    {
        var customer = await _uow.Repository<Customer>().GetByIdAsync(id);
        if (customer is null) return ApiResponse<CustomerDto>.Fail(404, "Customer not found.");

        string url;
        try { url = await _files.SaveAsync(file, KycSubfolder); }
        catch (Exception ex) { return ApiResponse<CustomerDto>.Fail(400, ex.Message); }

        // Replace previous file if any.
        if (!string.IsNullOrWhiteSpace(customer.KycDocumentPath))
            _files.Delete(customer.KycDocumentPath);

        customer.KycDocumentPath = url;
        _uow.Repository<Customer>().Update(customer);
        await _uow.CompleteAsync();

        return await GetAsync(id);
    }

    public async Task<ApiResponse<CustomerContactDto>> AddContactAsync(Guid customerId, CustomerContactCreateDto dto)
    {
        if (!await _uow.Repository<Customer>().AnyAsync(c => c.Id == customerId))
            return ApiResponse<CustomerContactDto>.Fail(404, "Customer not found.");

        if (dto.IsPrimary)
            await UnsetExistingPrimaryContactAsync(customerId);

        var contact = new CustomerContact
        {
            CustomerId = customerId,
            Name = dto.Name.Trim(),
            Role = dto.Role?.Trim(),
            Phone = dto.Phone?.Trim(),
            Email = dto.Email?.Trim(),
            IsPrimary = dto.IsPrimary
        };

        await _uow.Repository<CustomerContact>().AddAsync(contact);
        await _uow.CompleteAsync();

        return ApiResponse<CustomerContactDto>.Created(_mapper.Map<CustomerContactDto>(contact));
    }

    public async Task<ApiResponse<CustomerContactDto>> UpdateContactAsync(Guid contactId, CustomerContactUpdateDto dto)
    {
        var contact = await _uow.Repository<CustomerContact>().GetByIdAsync(contactId);
        if (contact is null) return ApiResponse<CustomerContactDto>.Fail(404, "Contact not found.");

        if (dto.IsPrimary && !contact.IsPrimary)
            await UnsetExistingPrimaryContactAsync(contact.CustomerId);

        contact.Name = dto.Name.Trim();
        contact.Role = dto.Role?.Trim();
        contact.Phone = dto.Phone?.Trim();
        contact.Email = dto.Email?.Trim();
        contact.IsPrimary = dto.IsPrimary;

        _uow.Repository<CustomerContact>().Update(contact);
        await _uow.CompleteAsync();

        return ApiResponse<CustomerContactDto>.Ok(_mapper.Map<CustomerContactDto>(contact));
    }

    public async Task<ApiResponse> RemoveContactAsync(Guid contactId)
    {
        var contact = await _uow.Repository<CustomerContact>().GetByIdAsync(contactId);
        if (contact is null) return ApiResponse.Fail(404, "Contact not found.");

        _uow.Repository<CustomerContact>().SoftDelete(contact);
        await _uow.CompleteAsync();
        return ApiResponse.Ok("Contact removed.");
    }

    public async Task<ApiResponse<CustomerAddressDto>> AddAddressAsync(Guid customerId, CustomerAddressCreateDto dto)
    {
        if (!await _uow.Repository<Customer>().AnyAsync(c => c.Id == customerId))
            return ApiResponse<CustomerAddressDto>.Fail(404, "Customer not found.");

        if (dto.IsDefault)
            await UnsetExistingDefaultAddressAsync(customerId, dto.Kind);

        var address = new CustomerAddress
        {
            CustomerId = customerId,
            Kind = dto.Kind,
            Line1 = dto.Line1.Trim(),
            Line2 = dto.Line2?.Trim(),
            City = dto.City.Trim(),
            Region = dto.Region?.Trim(),
            Country = dto.Country?.Trim(),
            GeoLat = dto.GeoLat,
            GeoLng = dto.GeoLng,
            IsDefault = dto.IsDefault
        };

        await _uow.Repository<CustomerAddress>().AddAsync(address);
        await _uow.CompleteAsync();

        return ApiResponse<CustomerAddressDto>.Created(_mapper.Map<CustomerAddressDto>(address));
    }

    public async Task<ApiResponse<CustomerAddressDto>> UpdateAddressAsync(Guid addressId, CustomerAddressUpdateDto dto)
    {
        var address = await _uow.Repository<CustomerAddress>().GetByIdAsync(addressId);
        if (address is null) return ApiResponse<CustomerAddressDto>.Fail(404, "Address not found.");

        if (dto.IsDefault && (!address.IsDefault || address.Kind != dto.Kind))
            await UnsetExistingDefaultAddressAsync(address.CustomerId, dto.Kind);

        address.Kind = dto.Kind;
        address.Line1 = dto.Line1.Trim();
        address.Line2 = dto.Line2?.Trim();
        address.City = dto.City.Trim();
        address.Region = dto.Region?.Trim();
        address.Country = dto.Country?.Trim();
        address.GeoLat = dto.GeoLat;
        address.GeoLng = dto.GeoLng;
        address.IsDefault = dto.IsDefault;

        _uow.Repository<CustomerAddress>().Update(address);
        await _uow.CompleteAsync();

        return ApiResponse<CustomerAddressDto>.Ok(_mapper.Map<CustomerAddressDto>(address));
    }

    public async Task<ApiResponse> RemoveAddressAsync(Guid addressId)
    {
        var address = await _uow.Repository<CustomerAddress>().GetByIdAsync(addressId);
        if (address is null) return ApiResponse.Fail(404, "Address not found.");

        _uow.Repository<CustomerAddress>().SoftDelete(address);
        await _uow.CompleteAsync();
        return ApiResponse.Ok("Address removed.");
    }

    public async Task<ApiResponse<CustomerNoteDto>> AddNoteAsync(Guid customerId, CustomerNoteCreateDto dto, Guid? authorUserId)
    {
        if (!await _uow.Repository<Customer>().AnyAsync(c => c.Id == customerId))
            return ApiResponse<CustomerNoteDto>.Fail(404, "Customer not found.");

        var note = new CustomerNote
        {
            CustomerId = customerId,
            Body = dto.Body.Trim(),
            AuthorUserId = authorUserId
        };

        await _uow.Repository<CustomerNote>().AddAsync(note);
        await _uow.CompleteAsync();

        // Reload with author so AuthorName resolves.
        var saved = await _uow.Repository<CustomerNote>().Query()
            .Include(n => n.AuthorUser)
            .FirstOrDefaultAsync(n => n.Id == note.Id);

        return ApiResponse<CustomerNoteDto>.Created(_mapper.Map<CustomerNoteDto>(saved ?? note));
    }

    // --------------- helpers ---------------

    private IQueryable<Customer> LoadDetailQuery() =>
        _uow.Repository<Customer>().Query()
            .Include(c => c.SalesRep)
            .Include(c => c.Contacts)
            .Include(c => c.Addresses)
            .Include(c => c.Notes).ThenInclude(n => n.AuthorUser);

    private async Task UnsetExistingPrimaryContactAsync(Guid customerId)
    {
        var existing = await _uow.Repository<CustomerContact>()
            .FindAsync(c => c.CustomerId == customerId && c.IsPrimary);

        foreach (var c in existing)
        {
            c.IsPrimary = false;
            _uow.Repository<CustomerContact>().Update(c);
        }
    }

    private async Task UnsetExistingDefaultAddressAsync(Guid customerId, AddressKind kind)
    {
        var existing = await _uow.Repository<CustomerAddress>()
            .FindAsync(a => a.CustomerId == customerId && a.Kind == kind && a.IsDefault);

        foreach (var a in existing)
        {
            a.IsDefault = false;
            _uow.Repository<CustomerAddress>().Update(a);
        }
    }

    private async Task<string> NextCustomerCodeAsync()
    {
        // Simple "scan max" — fine for small scale. Replace with counter table when needed.
        var lastCode = await _uow.Repository<Customer>().Query()
            .OrderByDescending(c => c.Code)
            .Select(c => c.Code)
            .FirstOrDefaultAsync();

        var nextNum = 1;
        if (!string.IsNullOrWhiteSpace(lastCode) && lastCode.StartsWith("CUST-") &&
            int.TryParse(lastCode.AsSpan(5), out var parsed))
        {
            nextNum = parsed + 1;
        }

        return $"CUST-{nextNum:D5}";
    }
}
