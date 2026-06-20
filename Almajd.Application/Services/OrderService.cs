using Almajd.Application.Common;
using Almajd.Application.DTOs.Sales;
using Almajd.Application.Interfaces;
using Almajd.Domain.Entities;
using Almajd.Domain.Enums;
using AutoMapper;
using Microsoft.EntityFrameworkCore;

namespace Almajd.Application.Services;

public class OrderService : IOrderService
{
    private readonly IUnitOfWork _uow;
    private readonly IMapper _mapper;
    private readonly IPricingService _pricing;
    private readonly ICustomerCreditService _credit;
    private readonly ICurrentUserService _currentUser;
    private readonly INotificationService _notify;

    public OrderService(
        IUnitOfWork uow,
        IMapper mapper,
        IPricingService pricing,
        ICustomerCreditService credit,
        ICurrentUserService currentUser,
        INotificationService notify)
    {
        _uow = uow;
        _mapper = mapper;
        _pricing = pricing;
        _credit = credit;
        _currentUser = currentUser;
        _notify = notify;
    }

    // ----- queries -----

    public async Task<ApiResponse<PagedResult<OrderListItemDto>>> SearchAsync(OrderSearchQuery q)
    {
        // Customer self-scoping: ignore client-supplied CustomerId and force the caller's own.
        if (_currentUser.IsCustomerOnly)
        {
            if (_currentUser.CustomerId is null)
                return ApiResponse<PagedResult<OrderListItemDto>>.Fail(403, "Customer profile not linked.");
            q.CustomerId = _currentUser.CustomerId;
        }

        var page = Math.Max(q.Page, 1);
        var pageSize = Math.Clamp(q.PageSize, 1, 200);

        IQueryable<Order> query = _uow.Repository<Order>().Query()
            .Include(o => o.Customer)
            .Include(o => o.Lines)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var term = $"%{q.Search.Trim()}%";
            query = query.Where(o =>
                EF.Functions.Like(o.Number, term) ||
                EF.Functions.Like(o.Customer.LegalName, term) ||
                (o.Customer.TradeName != null && EF.Functions.Like(o.Customer.TradeName, term)));
        }

        if (q.CustomerId.HasValue) query = query.Where(o => o.CustomerId == q.CustomerId);
        if (q.Status.HasValue) query = query.Where(o => o.Status == q.Status);
        if (q.Channel.HasValue) query = query.Where(o => o.Channel == q.Channel);
        if (q.SalesRepId.HasValue) query = query.Where(o => o.SalesRepId == q.SalesRepId);
        if (q.From.HasValue) query = query.Where(o => o.CreatedAt >= q.From);
        if (q.To.HasValue) query = query.Where(o => o.CreatedAt <= q.To);

        if (q.Late == true)
        {
            var now = DateTime.UtcNow;
            query = query.Where(o => o.ExpectedShipAt != null && o.ExpectedShipAt < now && o.Status < OrderStatus.Shipped);
        }

        query = q.Sort switch
        {
            "total-desc" => query.OrderByDescending(o => o.Total),
            "total-asc" => query.OrderBy(o => o.Total),
            "status" => query.OrderBy(o => o.Status).ThenByDescending(o => o.CreatedAt),
            _ => query.OrderByDescending(o => o.CreatedAt)
        };

        var total = await query.CountAsync();
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return ApiResponse<PagedResult<OrderListItemDto>>.Ok(new PagedResult<OrderListItemDto>
        {
            Items = items.Select(_mapper.Map<OrderListItemDto>).ToList(),
            Total = total,
            Page = page,
            PageSize = pageSize
        });
    }

    public async Task<ApiResponse<OrderDto>> GetAsync(Guid id)
    {
        var o = await LoadDetailQuery().FirstOrDefaultAsync(x => x.Id == id);
        if (o is null) return ApiResponse<OrderDto>.Fail(404, "Order not found.");
        if (!CanCustomerAccess(o.CustomerId)) return ApiResponse<OrderDto>.Fail(404, "Order not found.");
        return ApiResponse<OrderDto>.Ok(_mapper.Map<OrderDto>(o));
    }

    public async Task<ApiResponse<OrderDto>> GetByNumberAsync(string number)
    {
        var normalized = number.Trim().ToUpperInvariant();
        var o = await LoadDetailQuery().FirstOrDefaultAsync(x => x.Number == normalized);
        if (o is null) return ApiResponse<OrderDto>.Fail(404, "Order not found.");
        if (!CanCustomerAccess(o.CustomerId)) return ApiResponse<OrderDto>.Fail(404, "Order not found.");
        return ApiResponse<OrderDto>.Ok(_mapper.Map<OrderDto>(o));
    }

    private bool CanCustomerAccess(Guid customerId) =>
        !_currentUser.IsCustomerOnly || _currentUser.CustomerId == customerId;

    // ----- mutations -----

    public async Task<ApiResponse<OrderDto>> CreateDraftAsync(OrderCreateDto dto, Guid? salesRepId)
    {
        // Customer self-scoping: a customer can only place orders for themselves.
        if (_currentUser.IsCustomerOnly)
        {
            if (_currentUser.CustomerId is null)
                return ApiResponse<OrderDto>.Fail(403, "Customer profile not linked.");
            dto.CustomerId = _currentUser.CustomerId.Value;
            dto.Channel = OrderChannel.App;
        }

        var customer = await _uow.Repository<Customer>().GetByIdAsync(dto.CustomerId);
        if (customer is null) return ApiResponse<OrderDto>.Fail(400, "Customer not found.");
        if (customer.Status == CustomerStatus.Suspended)
            return ApiResponse<OrderDto>.Fail(409, "Customer is suspended.");

        var order = new Order
        {
            Number = await NextOrderNumberAsync(),
            CustomerId = dto.CustomerId,
            Channel = dto.Channel,
            Status = OrderStatus.Draft,
            Currency = "EGP",
            PaymentTermsNetDays = customer.PaymentTermsNetDays,
            ShipToAddressId = dto.ShipToAddressId,
            SalesRepId = salesRepId,
            Notes = dto.Notes,
            ExpectedShipAt = dto.ExpectedShipAt
        };

        var pricedLines = await PriceAllLinesAsync(dto.CustomerId, dto.Lines);
        if (!pricedLines.IsSuccess) return ApiResponse<OrderDto>.Fail(pricedLines.StatusCode, pricedLines.Message!);

        ApplyLinesToOrder(order, pricedLines.Data!);
        await ApplyCouponAsync(order, dto.CouponCode);
        await SnapshotShipToAsync(order);

        await _uow.Repository<Order>().AddAsync(order);
        await _uow.CompleteAsync();

        return await GetAsync(order.Id) is { IsSuccess: true } loaded
            ? ApiResponse<OrderDto>.Created(loaded.Data!)
            : ApiResponse<OrderDto>.Fail(500, "Order created but failed to reload.");
    }

    public async Task<ApiResponse<OrderDto>> UpdateDraftAsync(Guid id, OrderUpdateDraftDto dto)
    {
        var order = await _uow.Repository<Order>().Query()
            .Include(o => o.Lines)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order is null) return ApiResponse<OrderDto>.Fail(404, "Order not found.");
        if (!CanCustomerAccess(order.CustomerId)) return ApiResponse<OrderDto>.Fail(404, "Order not found.");
        if (order.Status != OrderStatus.Draft)
            return ApiResponse<OrderDto>.Fail(409, $"Only Draft orders can be edited (current: {order.Status}).");

        order.ShipToAddressId = dto.ShipToAddressId;
        order.Notes = dto.Notes;
        order.ExpectedShipAt = dto.ExpectedShipAt;

        // Replace lines wholesale
        foreach (var existing in order.Lines.ToList())
            _uow.Repository<OrderLine>().SoftDelete(existing);
        order.Lines.Clear();

        var pricedLines = await PriceAllLinesAsync(order.CustomerId, dto.Lines);
        if (!pricedLines.IsSuccess) return ApiResponse<OrderDto>.Fail(pricedLines.StatusCode, pricedLines.Message!);

        ApplyLinesToOrder(order, pricedLines.Data!);
        await ApplyCouponAsync(order, dto.CouponCode);
        await SnapshotShipToAsync(order);

        _uow.Repository<Order>().Update(order);
        await _uow.CompleteAsync();

        return await GetAsync(id);
    }

    public async Task<ApiResponse<OrderDto>> SubmitAsync(Guid id, Guid? userId)
    {
        var order = await _uow.Repository<Order>().Query()
            .Include(o => o.Lines)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order is null) return ApiResponse<OrderDto>.Fail(404, "Order not found.");
        if (!CanCustomerAccess(order.CustomerId)) return ApiResponse<OrderDto>.Fail(404, "Order not found.");
        if (order.Status != OrderStatus.Draft)
            return ApiResponse<OrderDto>.Fail(409, $"Only Draft orders can be submitted (current: {order.Status}).");
        if (order.Lines.Count == 0)
            return ApiResponse<OrderDto>.Fail(400, "Order has no lines.");

        order.Status = OrderStatus.Submitted;
        order.SubmittedAt = DateTime.UtcNow;

        // 1. Credit check
        var credit = await _credit.CheckAsync(order.CustomerId, order.Total);
        if (!credit.IsSuccess) return ApiResponse<OrderDto>.Fail(credit.StatusCode, credit.Message!);

        if (credit.Data!.RequiresReview)
        {
            order.Status = OrderStatus.UnderReview;
            _uow.Repository<Order>().Update(order);
            await _uow.CompleteAsync();
            return await GetAsync(id);
        }

        if (!credit.Data.Approved)
        {
            order.Status = OrderStatus.Cancelled;
            order.CancelledAt = DateTime.UtcNow;
            order.CancellationReason = credit.Data.Reason;
            _uow.Repository<Order>().Update(order);
            await _uow.CompleteAsync();
            return await GetAsync(id);
        }

        // 2. Reserve stock for each line
        var reserveError = await ReserveAllLinesAsync(order, userId);
        if (reserveError is not null) return ApiResponse<OrderDto>.Fail(409, reserveError);

        order.Status = OrderStatus.Approved;
        order.ApprovedAt = DateTime.UtcNow;

        // 3. Auto-generate picklist from the reserved lines
        await GeneratePickListAsync(order);

        _uow.Repository<Order>().Update(order);
        await _uow.CompleteAsync();

        await NotifyOrderApprovedAsync(order);

        return await GetAsync(id);
    }

    public async Task<ApiResponse<OrderDto>> ApproveAsync(Guid id, Guid? userId)
    {
        var order = await _uow.Repository<Order>().Query()
            .Include(o => o.Lines)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order is null) return ApiResponse<OrderDto>.Fail(404, "Order not found.");
        if (order.Status != OrderStatus.UnderReview)
            return ApiResponse<OrderDto>.Fail(409, $"Only UnderReview orders can be approved (current: {order.Status}).");

        var reserveError = await ReserveAllLinesAsync(order, userId);
        if (reserveError is not null) return ApiResponse<OrderDto>.Fail(409, reserveError);

        order.Status = OrderStatus.Approved;
        order.ApprovedAt = DateTime.UtcNow;

        await GeneratePickListAsync(order);

        _uow.Repository<Order>().Update(order);
        await _uow.CompleteAsync();

        await NotifyOrderApprovedAsync(order);

        return await GetAsync(id);
    }

    public async Task<ApiResponse<OrderDto>> CancelAsync(Guid id, CancelOrderDto dto, Guid? userId)
    {
        var order = await _uow.Repository<Order>().Query()
            .Include(o => o.Lines)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order is null) return ApiResponse<OrderDto>.Fail(404, "Order not found.");
        if (!CanCustomerAccess(order.CustomerId)) return ApiResponse<OrderDto>.Fail(404, "Order not found.");

        if (order.Status is OrderStatus.Shipped or OrderStatus.Delivered or OrderStatus.Closed)
            return ApiResponse<OrderDto>.Fail(409, $"Orders in state {order.Status} cannot be cancelled.");

        if (order.Status == OrderStatus.Cancelled)
            return ApiResponse<OrderDto>.Fail(409, "Order is already cancelled.");

        // Release reservations if any were taken
        if (order.Status is OrderStatus.Approved or OrderStatus.InPreparation or OrderStatus.ReadyToShip)
            await ReleaseAllReservationsAsync(order, userId);

        order.Status = OrderStatus.Cancelled;
        order.CancelledAt = DateTime.UtcNow;
        order.CancellationReason = dto.Reason;

        _uow.Repository<Order>().Update(order);
        await _uow.CompleteAsync();

        return await GetAsync(id);
    }

    public async Task<ApiResponse<OrderDto>> ReorderAsync(Guid sourceOrderId, Guid? salesRepId)
    {
        var source = await _uow.Repository<Order>().Query()
            .Include(o => o.Lines)
            .Include(o => o.Customer)
            .FirstOrDefaultAsync(o => o.Id == sourceOrderId);

        if (source is null) return ApiResponse<OrderDto>.Fail(404, "Source order not found.");
        if (!CanCustomerAccess(source.CustomerId)) return ApiResponse<OrderDto>.Fail(404, "Source order not found.");

        var input = new OrderCreateDto
        {
            CustomerId = source.CustomerId,
            Channel = source.Channel,
            ShipToAddressId = source.ShipToAddressId,
            Notes = $"Reorder of {source.Number}",
            Lines = source.Lines.Select(l => new OrderLineInputDto
            {
                SkuId = l.SkuId,
                Qty = l.Qty
            }).ToList()
        };

        return await CreateDraftAsync(input, salesRepId);
    }

    // ----- helpers -----

    private IQueryable<Order> LoadDetailQuery() =>
        _uow.Repository<Order>().Query()
            .Include(o => o.Customer)
            .Include(o => o.SalesRep)
            .Include(o => o.Coupon)
            .Include(o => o.ShipToAddress)
            .Include(o => o.Lines).ThenInclude(l => l.Sku).ThenInclude(s => s.Product)
            .Include(o => o.Lines).ThenInclude(l => l.ReservedFromLocation);

    private async Task<ApiResponse<List<(OrderLineInputDto Input, PricedLine Priced)>>> PriceAllLinesAsync(
        Guid customerId, IReadOnlyList<OrderLineInputDto> inputs)
    {
        var result = new List<(OrderLineInputDto, PricedLine)>(inputs.Count);

        foreach (var input in inputs)
        {
            var priced = await _pricing.PriceLineAsync(
                customerId, input.SkuId, input.Qty,
                input.UnitPriceOverride, input.DiscountPctOverride);

            if (!priced.IsSuccess)
                return ApiResponse<List<(OrderLineInputDto, PricedLine)>>.Fail(priced.StatusCode,
                    $"SKU {input.SkuId}: {priced.Message}");

            result.Add((input, priced.Data!));
        }

        return ApiResponse<List<(OrderLineInputDto, PricedLine)>>.Ok(result);
    }

    private static void ApplyLinesToOrder(Order order, List<(OrderLineInputDto Input, PricedLine Priced)> priced)
    {
        decimal subTotal = 0, lineDiscount = 0, taxTotal = 0;

        foreach (var (input, p) in priced)
        {
            var lineSub = p.UnitPrice * p.Qty;
            var lineDisc = Math.Round(lineSub * (p.DiscountPct / 100m), 2, MidpointRounding.AwayFromZero);
            var lineNet = lineSub - lineDisc;
            var lineTax = Math.Round(lineNet * (p.TaxPct / 100m), 2, MidpointRounding.AwayFromZero);
            var lineTotal = lineNet + lineTax;

            order.Lines.Add(new OrderLine
            {
                SkuId = p.SkuId,
                Qty = p.Qty,
                UnitPrice = p.UnitPrice,
                DiscountPct = p.DiscountPct,
                TaxPct = p.TaxPct,
                PriceSource = p.PriceSource,
                LineSubTotal = lineSub,
                LineDiscountAmount = lineDisc,
                LineNet = lineNet,
                LineTaxAmount = lineTax,
                LineTotal = lineTotal
            });

            subTotal += lineSub;
            lineDiscount += lineDisc;
            taxTotal += lineTax;
        }

        order.SubTotal = subTotal;
        order.LineDiscountTotal = lineDiscount;
        order.TaxTotal = taxTotal;
        order.Total = subTotal - lineDiscount + taxTotal - order.CouponDiscountAmount;
    }

    private async Task ApplyCouponAsync(Order order, string? couponCode)
    {
        order.CouponId = null;
        order.CouponDiscountAmount = 0;

        if (string.IsNullOrWhiteSpace(couponCode))
        {
            RecalculateTotal(order);
            return;
        }

        var code = couponCode.Trim().ToUpperInvariant();
        var coupon = await _uow.Repository<DiscountCoupon>().FirstOrDefaultAsync(c => c.Code == code);

        if (coupon is null || !coupon.IsActive) return;
        var now = DateTime.UtcNow;
        if (coupon.ValidFrom is not null && coupon.ValidFrom > now) return;
        if (coupon.ValidTo is not null && coupon.ValidTo < now) return;
        if (coupon.UsageCap > 0 && coupon.UsageCount >= coupon.UsageCap) return;

        var basis = order.SubTotal - order.LineDiscountTotal;
        var discount = coupon.Type == DiscountType.Percentage
            ? Math.Round(basis * (coupon.Value / 100m), 2, MidpointRounding.AwayFromZero)
            : Math.Min(coupon.Value, basis);

        order.CouponId = coupon.Id;
        order.CouponDiscountAmount = discount;

        RecalculateTotal(order);
    }

    private static void RecalculateTotal(Order order) =>
        order.Total = order.SubTotal - order.LineDiscountTotal + order.TaxTotal - order.CouponDiscountAmount;

    private async Task SnapshotShipToAsync(Order order)
    {
        if (order.ShipToAddressId is null) return;

        var address = await _uow.Repository<CustomerAddress>().GetByIdAsync(order.ShipToAddressId.Value);
        if (address is null) return;

        var parts = new List<string?> { address.Line1, address.Line2, address.City, address.Region, address.Country };
        order.ShipToAddressSnapshot = string.Join(", ", parts.Where(p => !string.IsNullOrWhiteSpace(p)));
    }

    private async Task NotifyOrderApprovedAsync(Order order)
    {
        var data = new Dictionary<string, string>
        {
            ["OrderNumber"] = order.Number,
            ["CustomerName"] = order.Customer?.TradeName ?? order.Customer?.LegalName ?? "Customer",
            ["Total"] = order.Total.ToString("N2"),
            ["Currency"] = order.Currency
        };
        await _notify.DispatchToCustomerAsync(order.CustomerId, "ORDER_APPROVED", data);
    }

    private async Task GeneratePickListAsync(Order order)
    {
        // Idempotency — don't create a duplicate
        if (await _uow.Repository<PickList>().AnyAsync(p => p.OrderId == order.Id))
            return;

        var pickList = new PickList
        {
            OrderId = order.Id,
            Status = PickListStatus.Pending,
            GeneratedAt = DateTime.UtcNow
        };

        foreach (var line in order.Lines.Where(l => l.ReservedFromLocationId.HasValue))
        {
            pickList.Lines.Add(new PickListLine
            {
                OrderLineId = line.Id,
                SkuId = line.SkuId,
                LocationId = line.ReservedFromLocationId!.Value,
                RequestedQty = line.Qty,
                PickedQty = 0
            });
        }

        await _uow.Repository<PickList>().AddAsync(pickList);
    }

    private async Task<string?> ReserveAllLinesAsync(Order order, Guid? userId)
    {
        foreach (var line in order.Lines)
        {
            // Find best pickable location with enough available qty
            var locationId = await _uow.Repository<StockItem>().Query()
                .Include(s => s.Location)
                .Where(s => s.SkuId == line.SkuId
                         && s.Location.IsPickable
                         && (s.QtyOnHand - s.QtyReserved) >= line.Qty)
                .OrderByDescending(s => s.QtyOnHand - s.QtyReserved)
                .Select(s => (Guid?)s.LocationId)
                .FirstOrDefaultAsync();

            if (locationId is null)
                return $"Insufficient stock at any single location for SKU {line.SkuId} (qty {line.Qty}). Consolidate via transfer first.";

            var stockItem = await _uow.Repository<StockItem>()
                .FirstOrDefaultAsync(s => s.SkuId == line.SkuId && s.LocationId == locationId.Value);

            if (stockItem is null) return $"Stock vanished between read and write for SKU {line.SkuId}.";

            // Re-check the invariant in case of concurrent activity
            if (stockItem.QtyOnHand - stockItem.QtyReserved < line.Qty)
                return $"Stock became insufficient for SKU {line.SkuId} between price and reservation.";

            stockItem.QtyReserved += line.Qty;
            line.ReservedFromLocationId = locationId;

            await _uow.Repository<StockMovement>().AddAsync(new StockMovement
            {
                SkuId = line.SkuId,
                FromLocationId = locationId,
                Quantity = line.Qty,
                Type = StockMovementType.Reserve,
                ReferenceType = "Order",
                ReferenceId = order.Id,
                UserId = userId,
                OccurredAt = DateTime.UtcNow
            });
        }

        return null;
    }

    private async Task ReleaseAllReservationsAsync(Order order, Guid? userId)
    {
        foreach (var line in order.Lines.Where(l => l.ReservedFromLocationId.HasValue))
        {
            var stockItem = await _uow.Repository<StockItem>()
                .FirstOrDefaultAsync(s => s.SkuId == line.SkuId && s.LocationId == line.ReservedFromLocationId);

            if (stockItem is null) continue;
            if (stockItem.QtyReserved < line.Qty) continue;

            stockItem.QtyReserved -= line.Qty;

            await _uow.Repository<StockMovement>().AddAsync(new StockMovement
            {
                SkuId = line.SkuId,
                FromLocationId = line.ReservedFromLocationId,
                Quantity = line.Qty,
                Type = StockMovementType.Release,
                ReferenceType = "Order",
                ReferenceId = order.Id,
                UserId = userId,
                OccurredAt = DateTime.UtcNow
            });

            line.ReservedFromLocationId = null;
        }
    }

    private async Task<string> NextOrderNumberAsync()
    {
        var year = DateTime.UtcNow.Year;
        var prefix = $"ORD-{year}-";

        var last = await _uow.Repository<Order>().Query()
            .Where(o => o.Number.StartsWith(prefix))
            .OrderByDescending(o => o.Number)
            .Select(o => o.Number)
            .FirstOrDefaultAsync();

        var next = 1;
        if (!string.IsNullOrWhiteSpace(last) && int.TryParse(last.AsSpan(prefix.Length), out var parsed))
            next = parsed + 1;

        return $"{prefix}{next:D6}";
    }
}
