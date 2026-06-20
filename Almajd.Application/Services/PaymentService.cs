using Almajd.Application.Common;
using Almajd.Application.DTOs.Billing;
using Almajd.Application.Interfaces;
using Almajd.Domain.Entities;
using Almajd.Domain.Enums;
using AutoMapper;
using Microsoft.EntityFrameworkCore;

namespace Almajd.Application.Services;

public class PaymentService : IPaymentService
{
    private readonly IUnitOfWork _uow;
    private readonly IMapper _mapper;
    private readonly ICurrentUserService _currentUser;

    public PaymentService(IUnitOfWork uow, IMapper mapper, ICurrentUserService currentUser)
    {
        _uow = uow;
        _mapper = mapper;
        _currentUser = currentUser;
    }

    private bool CanCustomerAccess(Guid customerId) =>
        !_currentUser.IsCustomerOnly || _currentUser.CustomerId == customerId;

    public async Task<ApiResponse<PagedResult<PaymentDto>>> SearchAsync(PaymentSearchQuery q)
    {
        if (_currentUser.IsCustomerOnly)
        {
            if (_currentUser.CustomerId is null)
                return ApiResponse<PagedResult<PaymentDto>>.Fail(403, "Customer profile not linked.");
            q.CustomerId = _currentUser.CustomerId;
        }

        var page = Math.Max(q.Page, 1);
        var pageSize = Math.Clamp(q.PageSize, 1, 200);

        IQueryable<Payment> query = _uow.Repository<Payment>().Query()
            .Include(p => p.Customer)
            .Include(p => p.RecordedBy)
            .Include(p => p.Allocations).ThenInclude(a => a.Invoice)
            .AsNoTracking();

        if (q.CustomerId.HasValue) query = query.Where(p => p.CustomerId == q.CustomerId);
        if (q.Method.HasValue) query = query.Where(p => p.Method == q.Method);
        if (q.From.HasValue) query = query.Where(p => p.PaidAt >= q.From);
        if (q.To.HasValue) query = query.Where(p => p.PaidAt <= q.To);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(p => p.PaidAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync();

        return ApiResponse<PagedResult<PaymentDto>>.Ok(new PagedResult<PaymentDto>
        {
            Items = items.Select(_mapper.Map<PaymentDto>).ToList(),
            Total = total,
            Page = page,
            PageSize = pageSize
        });
    }

    public async Task<ApiResponse<PaymentDto>> GetAsync(Guid id)
    {
        var p = await LoadDetailQuery().FirstOrDefaultAsync(x => x.Id == id);
        if (p is null) return ApiResponse<PaymentDto>.Fail(404, "Payment not found.");
        if (!CanCustomerAccess(p.CustomerId)) return ApiResponse<PaymentDto>.Fail(404, "Payment not found.");
        return ApiResponse<PaymentDto>.Ok(_mapper.Map<PaymentDto>(p));
    }

    public async Task<ApiResponse<PaymentDto>> RecordAsync(PaymentCreateDto dto, Guid? userId)
    {
        // Customers cannot record payments on the customer portal — only staff (Admin / Accountant).
        if (_currentUser.IsCustomerOnly)
            return ApiResponse<PaymentDto>.Fail(403, "Customers cannot record payments directly.");

        var customer = await _uow.Repository<Customer>().GetByIdAsync(dto.CustomerId);
        if (customer is null) return ApiResponse<PaymentDto>.Fail(400, "Customer not found.");

        // Validate allocations: sum must not exceed payment amount; each invoice must belong to this customer & be open
        var allocSum = dto.Allocations.Sum(a => a.Amount);
        if (allocSum > dto.Amount)
            return ApiResponse<PaymentDto>.Fail(400,
                $"Allocations ({allocSum:N2}) exceed payment amount ({dto.Amount:N2}).");

        var invoiceMap = new Dictionary<Guid, Invoice>();
        foreach (var alloc in dto.Allocations)
        {
            if (alloc.Amount <= 0)
                return ApiResponse<PaymentDto>.Fail(400, "Allocation amounts must be positive.");

            var invoice = await _uow.Repository<Invoice>().GetByIdAsync(alloc.InvoiceId);
            if (invoice is null)
                return ApiResponse<PaymentDto>.Fail(400, $"Invoice {alloc.InvoiceId} not found.");
            if (invoice.CustomerId != customer.Id)
                return ApiResponse<PaymentDto>.Fail(400, $"Invoice {invoice.Number} does not belong to customer.");
            if (invoice.Status == InvoiceStatus.Void)
                return ApiResponse<PaymentDto>.Fail(409, $"Invoice {invoice.Number} is void.");

            var outstanding = invoice.Total - invoice.AmountPaid;
            if (alloc.Amount > outstanding)
                return ApiResponse<PaymentDto>.Fail(400,
                    $"Allocation {alloc.Amount:N2} exceeds outstanding {outstanding:N2} on invoice {invoice.Number}.");

            invoiceMap[invoice.Id] = invoice;
        }

        var payment = new Payment
        {
            Number = await NextPaymentNumberAsync(),
            CustomerId = customer.Id,
            Method = dto.Method,
            Amount = dto.Amount,
            Currency = dto.Currency,
            PaidAt = dto.PaidAt ?? DateTime.UtcNow,
            Reference = dto.Reference,
            Notes = dto.Notes,
            RecordedByUserId = userId
        };

        foreach (var alloc in dto.Allocations)
        {
            var invoice = invoiceMap[alloc.InvoiceId];
            payment.Allocations.Add(new PaymentAllocation
            {
                InvoiceId = invoice.Id,
                Amount = alloc.Amount
            });

            invoice.AmountPaid += alloc.Amount;
            invoice.Status = invoice.AmountPaid >= invoice.Total
                ? InvoiceStatus.Paid
                : InvoiceStatus.PartiallyPaid;
            _uow.Repository<Invoice>().Update(invoice);
        }

        customer.CurrentAr -= allocSum;
        if (customer.CurrentAr < 0) customer.CurrentAr = 0;

        await _uow.Repository<Payment>().AddAsync(payment);
        _uow.Repository<Customer>().Update(customer);
        await _uow.CompleteAsync();

        return ApiResponse<PaymentDto>.Created((await GetAsync(payment.Id)).Data!);
    }

    private IQueryable<Payment> LoadDetailQuery() =>
        _uow.Repository<Payment>().Query()
            .Include(p => p.Customer)
            .Include(p => p.RecordedBy)
            .Include(p => p.Allocations).ThenInclude(a => a.Invoice);

    private async Task<string> NextPaymentNumberAsync()
    {
        var year = DateTime.UtcNow.Year;
        var prefix = $"PAY-{year}-";

        var last = await _uow.Repository<Payment>().Query()
            .Where(p => p.Number.StartsWith(prefix))
            .OrderByDescending(p => p.Number)
            .Select(p => p.Number)
            .FirstOrDefaultAsync();

        var next = 1;
        if (!string.IsNullOrWhiteSpace(last) && int.TryParse(last.AsSpan(prefix.Length), out var parsed))
            next = parsed + 1;

        return $"{prefix}{next:D6}";
    }
}
