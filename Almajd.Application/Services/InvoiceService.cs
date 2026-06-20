using Almajd.Application.Common;
using Almajd.Application.DTOs.Billing;
using Almajd.Application.Interfaces;
using Almajd.Domain.Entities;
using Almajd.Domain.Enums;
using AutoMapper;
using Microsoft.EntityFrameworkCore;

namespace Almajd.Application.Services;

public class InvoiceService : IInvoiceService
{
    private readonly IUnitOfWork _uow;
    private readonly IMapper _mapper;
    private readonly IInvoiceNumberGenerator _numberGen;
    private readonly IInvoicePdfGenerator _pdf;
    private readonly ICurrentUserService _currentUser;
    private readonly INotificationService _notify;

    public InvoiceService(
        IUnitOfWork uow,
        IMapper mapper,
        IInvoiceNumberGenerator numberGen,
        IInvoicePdfGenerator pdf,
        ICurrentUserService currentUser,
        INotificationService notify)
    {
        _uow = uow;
        _mapper = mapper;
        _numberGen = numberGen;
        _pdf = pdf;
        _currentUser = currentUser;
        _notify = notify;
    }

    private bool CanCustomerAccess(Guid customerId) =>
        !_currentUser.IsCustomerOnly || _currentUser.CustomerId == customerId;

    public async Task<ApiResponse<PagedResult<InvoiceListItemDto>>> SearchAsync(InvoiceSearchQuery q)
    {
        if (_currentUser.IsCustomerOnly)
        {
            if (_currentUser.CustomerId is null)
                return ApiResponse<PagedResult<InvoiceListItemDto>>.Fail(403, "Customer profile not linked.");
            q.CustomerId = _currentUser.CustomerId;
        }

        var page = Math.Max(q.Page, 1);
        var pageSize = Math.Clamp(q.PageSize, 1, 200);

        IQueryable<Invoice> query = _uow.Repository<Invoice>().Query()
            .Include(i => i.Customer)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var term = $"%{q.Search.Trim()}%";
            query = query.Where(i =>
                EF.Functions.Like(i.Number, term) ||
                EF.Functions.Like(i.Customer.LegalName, term) ||
                (i.Customer.TradeName != null && EF.Functions.Like(i.Customer.TradeName, term)));
        }

        if (q.CustomerId.HasValue) query = query.Where(i => i.CustomerId == q.CustomerId);
        if (q.Status.HasValue) query = query.Where(i => i.Status == q.Status);
        if (q.From.HasValue) query = query.Where(i => i.IssuedAt >= q.From);
        if (q.To.HasValue) query = query.Where(i => i.IssuedAt <= q.To);

        if (q.Overdue == true)
        {
            var now = DateTime.UtcNow;
            query = query.Where(i => i.DueAt < now && i.Total - i.AmountPaid > 0 && i.Status != InvoiceStatus.Void);
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(i => i.IssuedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync();

        return ApiResponse<PagedResult<InvoiceListItemDto>>.Ok(new PagedResult<InvoiceListItemDto>
        {
            Items = items.Select(_mapper.Map<InvoiceListItemDto>).ToList(),
            Total = total,
            Page = page,
            PageSize = pageSize
        });
    }

    public async Task<ApiResponse<InvoiceDto>> GetAsync(Guid id)
    {
        var inv = await LoadDetailQuery().FirstOrDefaultAsync(i => i.Id == id);
        if (inv is null) return ApiResponse<InvoiceDto>.Fail(404, "Invoice not found.");
        if (!CanCustomerAccess(inv.CustomerId)) return ApiResponse<InvoiceDto>.Fail(404, "Invoice not found.");
        return ApiResponse<InvoiceDto>.Ok(_mapper.Map<InvoiceDto>(inv));
    }

    public async Task<ApiResponse<InvoiceDto>> GetByNumberAsync(string number)
    {
        var normalized = number.Trim().ToUpperInvariant();
        var inv = await LoadDetailQuery().FirstOrDefaultAsync(i => i.Number == normalized);
        if (inv is null) return ApiResponse<InvoiceDto>.Fail(404, "Invoice not found.");
        if (!CanCustomerAccess(inv.CustomerId)) return ApiResponse<InvoiceDto>.Fail(404, "Invoice not found.");
        return ApiResponse<InvoiceDto>.Ok(_mapper.Map<InvoiceDto>(inv));
    }

    public async Task<ApiResponse<InvoiceDto>> IssueFromOrderAsync(IssueInvoiceFromOrderDto dto)
    {
        var order = await _uow.Repository<Order>().Query()
            .Include(o => o.Customer)
            .Include(o => o.Lines).ThenInclude(l => l.Sku).ThenInclude(s => s.Product)
            .FirstOrDefaultAsync(o => o.Id == dto.OrderId);

        if (order is null) return ApiResponse<InvoiceDto>.Fail(400, "Order not found.");

        if (order.Status is not OrderStatus.Shipped and not OrderStatus.Delivered and not OrderStatus.Closed)
            return ApiResponse<InvoiceDto>.Fail(409,
                $"Order must be shipped or delivered before invoicing (current: {order.Status}).");

        // Idempotency: if an invoice for this order already exists and isn't void, return it
        var existing = await _uow.Repository<Invoice>()
            .FirstOrDefaultAsync(i => i.OrderId == order.Id && i.Status != InvoiceStatus.Void);
        if (existing is not null)
            return await GetAsync(existing.Id);

        var shipment = await _uow.Repository<Shipment>()
            .FirstOrDefaultAsync(s => s.OrderId == order.Id);

        var netDays = dto.OverridePaymentTermsNetDays ?? order.PaymentTermsNetDays;
        var issuedAt = DateTime.UtcNow;
        var dueAt = issuedAt.AddDays(netDays);

        var invoice = new Invoice
        {
            Number = await _numberGen.NextAsync(issuedAt.Year),
            CustomerId = order.CustomerId,
            OrderId = order.Id,
            ShipmentId = shipment?.Id,
            Status = InvoiceStatus.Issued,
            Currency = order.Currency,
            IssuedAt = issuedAt,
            DueAt = dueAt,
            SubTotal = order.SubTotal,
            DiscountTotal = order.LineDiscountTotal + order.CouponDiscountAmount,
            TaxTotal = order.TaxTotal,
            Total = order.Total,
            AmountPaid = 0,
            ShipToAddressSnapshot = order.ShipToAddressSnapshot,
            Notes = dto.Notes
        };

        foreach (var orderLine in order.Lines)
        {
            invoice.Lines.Add(new InvoiceLine
            {
                SkuId = orderLine.SkuId,
                Description = orderLine.Sku.Product.Name,
                Qty = orderLine.Qty,
                UnitPrice = orderLine.UnitPrice,
                DiscountPct = orderLine.DiscountPct,
                TaxPct = orderLine.TaxPct,
                LineSubTotal = orderLine.LineSubTotal,
                LineDiscountAmount = orderLine.LineDiscountAmount,
                LineNet = orderLine.LineNet,
                LineTaxAmount = orderLine.LineTaxAmount,
                LineTotal = orderLine.LineTotal
            });
        }

        await _uow.Repository<Invoice>().AddAsync(invoice);

        // Update customer AR
        order.Customer.CurrentAr += invoice.Total;
        _uow.Repository<Customer>().Update(order.Customer);

        await _uow.CompleteAsync();

        await _notify.DispatchToCustomerAsync(invoice.CustomerId, "INVOICE_ISSUED",
            new Dictionary<string, string>
            {
                ["InvoiceNumber"] = invoice.Number,
                ["Total"] = invoice.Total.ToString("N2"),
                ["Currency"] = invoice.Currency,
                ["CustomerName"] = order.Customer.TradeName ?? order.Customer.LegalName,
                ["DueDate"] = invoice.DueAt.ToString("yyyy-MM-dd")
            });

        return await GetAsync(invoice.Id);
    }

    public async Task<ApiResponse<InvoiceDto>> VoidAsync(Guid id, VoidInvoiceDto dto)
    {
        var invoice = await _uow.Repository<Invoice>().Query()
            .Include(i => i.Customer)
            .FirstOrDefaultAsync(i => i.Id == id);

        if (invoice is null) return ApiResponse<InvoiceDto>.Fail(404, "Invoice not found.");
        if (invoice.Status == InvoiceStatus.Void)
            return ApiResponse<InvoiceDto>.Fail(409, "Invoice is already void.");
        if (invoice.AmountPaid > 0)
            return ApiResponse<InvoiceDto>.Fail(409,
                "Invoice has payments allocated. Reverse them before voiding.");

        invoice.Status = InvoiceStatus.Void;
        invoice.VoidedAt = DateTime.UtcNow;
        invoice.VoidReason = dto.Reason;

        invoice.Customer.CurrentAr -= invoice.Total;
        _uow.Repository<Invoice>().Update(invoice);
        _uow.Repository<Customer>().Update(invoice.Customer);
        await _uow.CompleteAsync();

        return await GetAsync(id);
    }

    public async Task<ApiResponse<byte[]>> ExportPdfAsync(Guid id)
    {
        var invoice = await LoadDetailQuery().FirstOrDefaultAsync(i => i.Id == id);
        if (invoice is null) return ApiResponse<byte[]>.Fail(404, "Invoice not found.");
        if (!CanCustomerAccess(invoice.CustomerId)) return ApiResponse<byte[]>.Fail(404, "Invoice not found.");

        var bytes = _pdf.Generate(invoice);
        return ApiResponse<byte[]>.Ok(bytes);
    }

    private IQueryable<Invoice> LoadDetailQuery() =>
        _uow.Repository<Invoice>().Query()
            .Include(i => i.Customer)
            .Include(i => i.Order)
            .Include(i => i.Shipment)
            .Include(i => i.Lines).ThenInclude(l => l.Sku).ThenInclude(s => s.Product);
}
