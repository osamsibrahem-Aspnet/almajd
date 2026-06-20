using Almajd.Application.Common;
using Almajd.Application.DTOs.Fulfilment;
using Almajd.Application.Interfaces;
using Almajd.Domain.Entities;
using Almajd.Domain.Enums;
using AutoMapper;
using Microsoft.EntityFrameworkCore;

namespace Almajd.Application.Services;

public class ShipmentService : IShipmentService
{
    private readonly IUnitOfWork _uow;
    private readonly IMapper _mapper;
    private readonly IInvoiceService _invoices;
    private readonly INotificationService _notify;

    public ShipmentService(IUnitOfWork uow, IMapper mapper, IInvoiceService invoices, INotificationService notify)
    {
        _uow = uow;
        _mapper = mapper;
        _invoices = invoices;
        _notify = notify;
    }

    public async Task<ApiResponse<PagedResult<ShipmentDto>>> SearchAsync(ShipmentSearchQuery q)
    {
        var page = Math.Max(q.Page, 1);
        var pageSize = Math.Clamp(q.PageSize, 1, 200);

        IQueryable<Shipment> query = _uow.Repository<Shipment>().Query()
            .Include(s => s.Order).ThenInclude(o => o.Customer)
            .AsNoTracking();

        if (q.Status.HasValue) query = query.Where(s => s.Status == q.Status);
        if (q.OrderId.HasValue) query = query.Where(s => s.OrderId == q.OrderId);
        if (q.From.HasValue) query = query.Where(s => s.CreatedAt >= q.From);
        if (q.To.HasValue) query = query.Where(s => s.CreatedAt <= q.To);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(s => s.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .ToListAsync();

        return ApiResponse<PagedResult<ShipmentDto>>.Ok(new PagedResult<ShipmentDto>
        {
            Items = items.Select(_mapper.Map<ShipmentDto>).ToList(),
            Total = total,
            Page = page,
            PageSize = pageSize
        });
    }

    public async Task<ApiResponse<ShipmentDto>> GetAsync(Guid id)
    {
        var s = await LoadQuery().FirstOrDefaultAsync(x => x.Id == id);
        return s is null
            ? ApiResponse<ShipmentDto>.Fail(404, "Shipment not found.")
            : ApiResponse<ShipmentDto>.Ok(_mapper.Map<ShipmentDto>(s));
    }

    public async Task<ApiResponse<ShipmentDto>> GetByNumberAsync(string number)
    {
        var normalized = number.Trim().ToUpperInvariant();
        var s = await LoadQuery().FirstOrDefaultAsync(x => x.Number == normalized);
        return s is null
            ? ApiResponse<ShipmentDto>.Fail(404, "Shipment not found.")
            : ApiResponse<ShipmentDto>.Ok(_mapper.Map<ShipmentDto>(s));
    }

    public async Task<ApiResponse<ShipmentDto>> CreateAsync(ShipmentCreateDto dto)
    {
        var order = await _uow.Repository<Order>().GetByIdAsync(dto.OrderId);
        if (order is null) return ApiResponse<ShipmentDto>.Fail(400, "Order not found.");

        if (order.Status != OrderStatus.ReadyToShip)
            return ApiResponse<ShipmentDto>.Fail(409,
                $"Order must be ReadyToShip to create a shipment (current: {order.Status}).");

        if (await _uow.Repository<Shipment>().AnyAsync(s => s.OrderId == dto.OrderId))
            return ApiResponse<ShipmentDto>.Fail(409, "A shipment already exists for this order.");

        var shipment = new Shipment
        {
            Number = await NextShipmentNumberAsync(),
            OrderId = dto.OrderId,
            Status = ShipmentStatus.Created,
            Carrier = dto.Carrier,
            Waybill = dto.Waybill,
            DriverName = dto.DriverName,
            DriverPhone = dto.DriverPhone,
            Notes = dto.Notes
        };

        await _uow.Repository<Shipment>().AddAsync(shipment);
        await _uow.CompleteAsync();

        return ApiResponse<ShipmentDto>.Created((await GetAsync(shipment.Id)).Data!);
    }

    public async Task<ApiResponse<ShipmentDto>> AssignDriverAsync(Guid id, AssignDriverDto dto)
    {
        var shipment = await _uow.Repository<Shipment>().GetByIdAsync(id);
        if (shipment is null) return ApiResponse<ShipmentDto>.Fail(404, "Shipment not found.");

        if (shipment.Status is ShipmentStatus.Delivered or ShipmentStatus.Cancelled)
            return ApiResponse<ShipmentDto>.Fail(409,
                $"Cannot change driver on a {shipment.Status} shipment.");

        shipment.DriverName = dto.DriverName;
        shipment.DriverPhone = dto.DriverPhone;
        if (!string.IsNullOrWhiteSpace(dto.Carrier)) shipment.Carrier = dto.Carrier;
        if (!string.IsNullOrWhiteSpace(dto.Waybill)) shipment.Waybill = dto.Waybill;

        _uow.Repository<Shipment>().Update(shipment);
        await _uow.CompleteAsync();

        return await GetAsync(id);
    }

    public async Task<ApiResponse<ShipmentDto>> DispatchAsync(Guid id, Guid? userId)
    {
        var shipment = await _uow.Repository<Shipment>().Query()
            .Include(s => s.Order).ThenInclude(o => o.Lines)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (shipment is null) return ApiResponse<ShipmentDto>.Fail(404, "Shipment not found.");
        if (shipment.Status != ShipmentStatus.Created)
            return ApiResponse<ShipmentDto>.Fail(409,
                $"Only Created shipments can be dispatched (current: {shipment.Status}).");

        if (string.IsNullOrWhiteSpace(shipment.DriverName))
            return ApiResponse<ShipmentDto>.Fail(400, "Driver must be assigned before dispatch.");

        // Load picklist lines to know how much was actually picked per OrderLine
        var pickList = await _uow.Repository<PickList>().Query()
            .Include(p => p.Lines)
            .FirstOrDefaultAsync(p => p.OrderId == shipment.OrderId);

        if (pickList is null)
            return ApiResponse<ShipmentDto>.Fail(409, "No picklist found for this order.");

        var byOrderLineId = pickList.Lines.ToDictionary(l => l.OrderLineId, l => l);

        // Convert reservations to outbound: per OrderLine, consume picked qty + release unmet
        foreach (var orderLine in shipment.Order.Lines.Where(l => l.ReservedFromLocationId.HasValue))
        {
            if (!byOrderLineId.TryGetValue(orderLine.Id, out var pickLine)) continue;

            var stockItem = await _uow.Repository<StockItem>()
                .FirstOrDefaultAsync(s => s.SkuId == orderLine.SkuId && s.LocationId == orderLine.ReservedFromLocationId);
            if (stockItem is null)
                return ApiResponse<ShipmentDto>.Fail(500,
                    $"Stock item missing for SKU {orderLine.SkuId} at reserved location.");

            // Sell the picked qty
            if (pickLine.PickedQty > 0)
            {
                if (stockItem.QtyOnHand < pickLine.PickedQty || stockItem.QtyReserved < pickLine.PickedQty)
                    return ApiResponse<ShipmentDto>.Fail(500,
                        $"Stock invariant broken for SKU {orderLine.SkuId} (qty {pickLine.PickedQty}).");

                stockItem.QtyOnHand -= pickLine.PickedQty;
                stockItem.QtyReserved -= pickLine.PickedQty;

                await _uow.Repository<StockMovement>().AddAsync(new StockMovement
                {
                    SkuId = orderLine.SkuId,
                    FromLocationId = orderLine.ReservedFromLocationId,
                    Quantity = pickLine.PickedQty,
                    Type = StockMovementType.Sell,
                    ReferenceType = "Shipment",
                    ReferenceId = shipment.Id,
                    UserId = userId,
                    OccurredAt = DateTime.UtcNow
                });
            }

            // Release the unmet reservation (short pick or zero pick)
            var unmet = orderLine.Qty - pickLine.PickedQty;
            if (unmet > 0)
            {
                if (stockItem.QtyReserved < unmet)
                    return ApiResponse<ShipmentDto>.Fail(500,
                        $"Reservation accounting broken for SKU {orderLine.SkuId} (release {unmet}).");

                stockItem.QtyReserved -= unmet;

                await _uow.Repository<StockMovement>().AddAsync(new StockMovement
                {
                    SkuId = orderLine.SkuId,
                    FromLocationId = orderLine.ReservedFromLocationId,
                    Quantity = unmet,
                    Type = StockMovementType.Release,
                    ReferenceType = "Shipment",
                    ReferenceId = shipment.Id,
                    UserId = userId,
                    OccurredAt = DateTime.UtcNow,
                    Notes = "Short pick — releasing unfulfilled reservation."
                });
            }
        }

        shipment.Status = ShipmentStatus.Dispatched;
        shipment.DispatchedAt = DateTime.UtcNow;

        shipment.Order.Status = OrderStatus.Shipped;
        shipment.Order.ShippedAt = DateTime.UtcNow;

        _uow.Repository<Shipment>().Update(shipment);
        _uow.Repository<Order>().Update(shipment.Order);
        await _uow.CompleteAsync();

        await _notify.DispatchToCustomerAsync(shipment.Order.CustomerId, "ORDER_SHIPPED",
            new Dictionary<string, string>
            {
                ["OrderNumber"] = shipment.Order.Number,
                ["DriverName"] = shipment.DriverName ?? "(unassigned)",
                ["Waybill"] = shipment.Waybill ?? "(none)"
            });

        return await GetAsync(id);
    }

    public async Task<ApiResponse<ShipmentDto>> DeliverAsync(Guid id, DeliverDto dto, Guid? userId)
    {
        var shipment = await _uow.Repository<Shipment>().Query()
            .Include(s => s.Order)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (shipment is null) return ApiResponse<ShipmentDto>.Fail(404, "Shipment not found.");

        if (shipment.Status != ShipmentStatus.Dispatched)
            return ApiResponse<ShipmentDto>.Fail(409,
                $"Only Dispatched shipments can be delivered (current: {shipment.Status}).");

        shipment.Status = ShipmentStatus.Delivered;
        shipment.DeliveredAt = DateTime.UtcNow;
        shipment.PodSignerName = dto.PodSignerName;
        shipment.PodUrl = dto.PodUrl;

        shipment.Order.Status = OrderStatus.Delivered;
        shipment.Order.DeliveredAt = DateTime.UtcNow;

        _uow.Repository<Shipment>().Update(shipment);
        _uow.Repository<Order>().Update(shipment.Order);
        await _uow.CompleteAsync();

        await _notify.DispatchToCustomerAsync(shipment.Order.CustomerId, "ORDER_DELIVERED",
            new Dictionary<string, string>
            {
                ["OrderNumber"] = shipment.Order.Number,
                ["DeliveredAt"] = shipment.DeliveredAt!.Value.ToString("yyyy-MM-dd HH:mm")
            });

        // Auto-issue invoice (separate transaction — if it fails, delivery is still committed and
        // ops can issue the invoice manually via /api/invoices/issue).
        await _invoices.IssueFromOrderAsync(new Almajd.Application.DTOs.Billing.IssueInvoiceFromOrderDto
        {
            OrderId = shipment.OrderId
        });

        return await GetAsync(id);
    }

    public async Task<ApiResponse<ShipmentDto>> CancelAsync(Guid id, CancelShipmentDto dto, Guid? userId)
    {
        var shipment = await _uow.Repository<Shipment>().GetByIdAsync(id);
        if (shipment is null) return ApiResponse<ShipmentDto>.Fail(404, "Shipment not found.");

        if (shipment.Status == ShipmentStatus.Delivered)
            return ApiResponse<ShipmentDto>.Fail(409, "Delivered shipment cannot be cancelled.");
        if (shipment.Status == ShipmentStatus.Cancelled)
            return ApiResponse<ShipmentDto>.Fail(409, "Shipment is already cancelled.");

        // Pre-dispatch cancel is straightforward. Post-dispatch cancel (rare) would require reversing the stock movement;
        // that is treated as a Return via the Returns module (Phase 2) — refuse here for safety.
        if (shipment.Status == ShipmentStatus.Dispatched)
            return ApiResponse<ShipmentDto>.Fail(409,
                "Dispatched shipment cannot be cancelled — open a Return through the Returns module instead.");

        shipment.Status = ShipmentStatus.Cancelled;
        shipment.Notes = (shipment.Notes is null ? "" : shipment.Notes + "\n") + $"Cancelled: {dto.Reason}";

        _uow.Repository<Shipment>().Update(shipment);
        await _uow.CompleteAsync();

        return await GetAsync(id);
    }

    private IQueryable<Shipment> LoadQuery() =>
        _uow.Repository<Shipment>().Query()
            .Include(s => s.Order).ThenInclude(o => o.Customer);

    private async Task<string> NextShipmentNumberAsync()
    {
        var year = DateTime.UtcNow.Year;
        var prefix = $"SHP-{year}-";

        var last = await _uow.Repository<Shipment>().Query()
            .Where(s => s.Number.StartsWith(prefix))
            .OrderByDescending(s => s.Number)
            .Select(s => s.Number)
            .FirstOrDefaultAsync();

        var next = 1;
        if (!string.IsNullOrWhiteSpace(last) && int.TryParse(last.AsSpan(prefix.Length), out var parsed))
            next = parsed + 1;

        return $"{prefix}{next:D6}";
    }
}
