using Almajd.Application.Common;
using Almajd.Application.DTOs.Reports;
using Almajd.Application.Interfaces;
using Almajd.Domain.Entities;
using Almajd.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Almajd.Application.Services;

public class ReportService : IReportService
{
    private readonly IUnitOfWork _uow;

    public ReportService(IUnitOfWork uow) => _uow = uow;

    public async Task<ApiResponse<IReadOnlyList<SalesReportPointDto>>> SalesAsync(SalesReportQuery q)
    {
        var from = q.From ?? DateTime.UtcNow.AddYears(-1);
        var to = q.To ?? DateTime.UtcNow;

        IQueryable<OrderLine> lines = _uow.Repository<OrderLine>().Query()
            .Include(l => l.Order).ThenInclude(o => o.Customer)
            .Include(l => l.Sku).ThenInclude(s => s.Product).ThenInclude(p => p.Category)
            .Include(l => l.Sku).ThenInclude(s => s.Product).ThenInclude(p => p.Brand)
            .Where(l => l.Order.Status >= OrderStatus.Shipped
                        && l.Order.Status != OrderStatus.Cancelled
                        && l.Order.ShippedAt >= from
                        && l.Order.ShippedAt <= to);

        if (q.CustomerId.HasValue) lines = lines.Where(l => l.Order.CustomerId == q.CustomerId);
        if (q.CategoryId.HasValue) lines = lines.Where(l => l.Sku.Product.CategoryId == q.CategoryId);
        if (q.BrandId.HasValue) lines = lines.Where(l => l.Sku.Product.BrandId == q.BrandId);

        var data = await lines.AsNoTracking().ToListAsync();

        string Bucket(OrderLine l)
        {
            var dt = l.Order.ShippedAt ?? l.Order.CreatedAt;
            return q.GroupBy?.ToLowerInvariant() switch
            {
                "day" => dt.ToString("yyyy-MM-dd"),
                "week" => $"{dt:yyyy}-W{System.Globalization.ISOWeek.GetWeekOfYear(dt):D2}",
                "year" => dt.Year.ToString(),
                _ => dt.ToString("yyyy-MM")
            };
        }

        var grouped = data
            .GroupBy(Bucket)
            .Select(g => new SalesReportPointDto
            {
                Bucket = g.Key,
                OrderCount = g.Select(x => x.OrderId).Distinct().Count(),
                UnitsSold = g.Sum(x => x.Qty),
                Revenue = g.Sum(x => x.LineTotal),
                Cost = g.Sum(x => (x.Sku.AverageCost ?? 0m) * x.Qty),
                Profit = g.Sum(x => x.LineTotal - (x.Sku.AverageCost ?? 0m) * x.Qty)
            })
            .OrderBy(p => p.Bucket)
            .ToList();

        return ApiResponse<IReadOnlyList<SalesReportPointDto>>.Ok(grouped);
    }

    public async Task<ApiResponse<IReadOnlyList<ProfitByProductDto>>> ProfitByProductAsync(DateTime? from, DateTime? to)
    {
        var fromAt = from ?? DateTime.UtcNow.AddMonths(-3);
        var toAt = to ?? DateTime.UtcNow;

        var lines = await _uow.Repository<OrderLine>().Query()
            .Include(l => l.Order)
            .Include(l => l.Sku).ThenInclude(s => s.Product)
            .Where(l => l.Order.Status >= OrderStatus.Shipped
                        && l.Order.Status != OrderStatus.Cancelled
                        && l.Order.ShippedAt >= fromAt
                        && l.Order.ShippedAt <= toAt)
            .AsNoTracking()
            .ToListAsync();

        var grouped = lines
            .GroupBy(l => new { l.SkuId, l.Sku.Code, l.Sku.Product.Name, l.Sku.AverageCost })
            .Select(g =>
            {
                var revenue = g.Sum(x => x.LineTotal);
                var cost = g.Sum(x => (x.Sku.AverageCost ?? 0m) * x.Qty);
                var profit = revenue - cost;
                return new ProfitByProductDto
                {
                    SkuId = g.Key.SkuId,
                    SkuCode = g.Key.Code,
                    ProductName = g.Key.Name,
                    UnitsSold = g.Sum(x => x.Qty),
                    Revenue = revenue,
                    Cost = cost,
                    Profit = profit,
                    MarginPct = revenue == 0 ? 0 : Math.Round(profit / revenue * 100m, 2)
                };
            })
            .OrderByDescending(p => p.Profit)
            .ToList();

        return ApiResponse<IReadOnlyList<ProfitByProductDto>>.Ok(grouped);
    }

    public async Task<ApiResponse<IReadOnlyList<TopCustomerDto>>> TopCustomersAsync(DateTime? from, DateTime? to, int top = 20)
    {
        var fromAt = from ?? DateTime.UtcNow.AddYears(-1);
        var toAt = to ?? DateTime.UtcNow;
        var take = Math.Clamp(top, 1, 200);

        var rows = await _uow.Repository<Order>().Query()
            .Include(o => o.Customer)
            .Where(o => o.Status != OrderStatus.Cancelled && o.SubmittedAt >= fromAt && o.SubmittedAt <= toAt)
            .GroupBy(o => new { o.CustomerId, o.Customer.Code, o.Customer.LegalName, o.Customer.TradeName })
            .Select(g => new TopCustomerDto
            {
                CustomerId = g.Key.CustomerId,
                CustomerCode = g.Key.Code,
                CustomerName = g.Key.TradeName ?? g.Key.LegalName,
                OrderCount = g.Count(),
                Revenue = g.Sum(x => x.Total),
                LastOrderAt = g.Max(x => x.SubmittedAt)
            })
            .OrderByDescending(r => r.Revenue)
            .Take(take)
            .ToListAsync();

        return ApiResponse<IReadOnlyList<TopCustomerDto>>.Ok(rows);
    }

    public async Task<ApiResponse<IReadOnlyList<SupplierSpendDto>>> SupplierSpendAsync(DateTime? from, DateTime? to)
    {
        var fromAt = from ?? DateTime.UtcNow.AddYears(-1);
        var toAt = to ?? DateTime.UtcNow;

        var rows = await _uow.Repository<PurchaseOrder>().Query()
            .Include(p => p.Supplier)
            .Where(p => p.Status != PurchaseOrderStatus.Cancelled
                        && p.Status != PurchaseOrderStatus.Draft
                        && p.SubmittedAt >= fromAt && p.SubmittedAt <= toAt)
            .GroupBy(p => new { p.SupplierId, p.Supplier.Name })
            .Select(g => new SupplierSpendDto
            {
                SupplierId = g.Key.SupplierId,
                SupplierName = g.Key.Name,
                PoCount = g.Count(),
                Spend = g.Sum(x => x.Total)
            })
            .OrderByDescending(r => r.Spend)
            .ToListAsync();

        return ApiResponse<IReadOnlyList<SupplierSpendDto>>.Ok(rows);
    }

    public async Task<ApiResponse<OperationalKpisDto>> OperationalKpisAsync()
    {
        var now = DateTime.UtcNow;
        var thirtyDaysAgo = now.AddDays(-30);

        var openOrders = await _uow.Repository<Order>().Query()
            .Where(o => o.Status >= OrderStatus.Submitted && o.Status < OrderStatus.Closed && o.Status != OrderStatus.Cancelled)
            .ToListAsync();

        var inPrep = openOrders.Count(o => o.Status == OrderStatus.InPreparation);
        var readyToShip = openOrders.Count(o => o.Status == OrderStatus.ReadyToShip);
        var shipped = openOrders.Count(o => o.Status == OrderStatus.Shipped);
        var lateOrders = openOrders.Count(o =>
            o.ExpectedShipAt.HasValue && o.ExpectedShipAt < now && o.Status < OrderStatus.Shipped);

        var totalOpen = openOrders.Count;
        var latePct = totalOpen == 0 ? 0m : Math.Round((decimal)lateOrders / totalOpen * 100m, 2);

        var shippedRecent = await _uow.Repository<Order>().Query()
            .Where(o => o.Status >= OrderStatus.Shipped && o.Status != OrderStatus.Cancelled
                        && o.ShippedAt >= thirtyDaysAgo && o.SubmittedAt != null)
            .Select(o => new { o.SubmittedAt, o.ShippedAt })
            .ToListAsync();

        var avgPrepHours = shippedRecent.Count == 0
            ? 0m
            : Math.Round((decimal)shippedRecent
                .Where(o => o.SubmittedAt != null && o.ShippedAt != null)
                .Average(o => (o.ShippedAt!.Value - o.SubmittedAt!.Value).TotalHours), 1);

        // Fill rate: lines with PickedQty == RequestedQty / total pickline rows in last 30 days
        var picklistLines = await _uow.Repository<PickListLine>().Query()
            .Include(l => l.PickList)
            .Where(l => l.PickList.CompletedAt >= thirtyDaysAgo)
            .Select(l => new { l.RequestedQty, l.PickedQty })
            .ToListAsync();

        var fillRate = picklistLines.Count == 0
            ? 100m
            : Math.Round((decimal)picklistLines.Count(l => l.PickedQty >= l.RequestedQty) / picklistLines.Count * 100m, 2);

        return ApiResponse<OperationalKpisDto>.Ok(new OperationalKpisDto
        {
            OpenOrders = totalOpen,
            OrdersInPreparation = inPrep,
            OrdersReadyToShip = readyToShip,
            OrdersShipped = shipped,
            LateOrders = lateOrders,
            LateOrderPct = latePct,
            AvgPrepHours = avgPrepHours,
            FillRatePct = fillRate
        });
    }
}
