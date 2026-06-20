using Almajd.Application.Common;
using Almajd.Application.DTOs.Billing;
using Almajd.Application.Interfaces;
using Almajd.Domain.Entities;
using Almajd.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Almajd.Application.Services;

public class ArAgingService : IArAgingService
{
    private readonly IUnitOfWork _uow;

    public ArAgingService(IUnitOfWork uow) => _uow = uow;

    public async Task<ApiResponse<ArAgingReportDto>> ComputeAsync(DateTime? asOf = null)
    {
        var cutoff = asOf ?? DateTime.UtcNow;

        var openInvoices = await _uow.Repository<Invoice>().Query()
            .Include(i => i.Customer)
            .Where(i => i.Status != InvoiceStatus.Void && i.Total - i.AmountPaid > 0)
            .AsNoTracking()
            .ToListAsync();

        var perCustomer = new Dictionary<Guid, CustomerArAgingDto>();
        decimal t0to30 = 0, t31to60 = 0, t61to90 = 0, t90plus = 0;
        int c0to30 = 0, c31to60 = 0, c61to90 = 0, c90plus = 0;

        foreach (var inv in openInvoices)
        {
            var outstanding = inv.Total - inv.AmountPaid;
            var daysOverdue = (cutoff - inv.DueAt).TotalDays;

            decimal b0 = 0, b1 = 0, b2 = 0, b3 = 0;
            if (daysOverdue <= 30) { b0 = outstanding; t0to30 += outstanding; c0to30++; }
            else if (daysOverdue <= 60) { b1 = outstanding; t31to60 += outstanding; c31to60++; }
            else if (daysOverdue <= 90) { b2 = outstanding; t61to90 += outstanding; c61to90++; }
            else { b3 = outstanding; t90plus += outstanding; c90plus++; }

            if (!perCustomer.TryGetValue(inv.CustomerId, out var row))
            {
                row = new CustomerArAgingDto
                {
                    CustomerId = inv.CustomerId,
                    CustomerCode = inv.Customer.Code,
                    CustomerName = inv.Customer.TradeName ?? inv.Customer.LegalName,
                    CurrentAr = inv.Customer.CurrentAr
                };
                perCustomer[inv.CustomerId] = row;
            }

            row.Bucket0To30 += b0;
            row.Bucket31To60 += b1;
            row.Bucket61To90 += b2;
            row.Bucket90Plus += b3;
        }

        return ApiResponse<ArAgingReportDto>.Ok(new ArAgingReportDto
        {
            AsOf = cutoff,
            Totals = new[]
            {
                new ArAgingBucketDto { Bucket = "0-30",  Amount = t0to30,  InvoiceCount = c0to30  },
                new ArAgingBucketDto { Bucket = "31-60", Amount = t31to60, InvoiceCount = c31to60 },
                new ArAgingBucketDto { Bucket = "61-90", Amount = t61to90, InvoiceCount = c61to90 },
                new ArAgingBucketDto { Bucket = "90+",   Amount = t90plus, InvoiceCount = c90plus }
            },
            ByCustomer = perCustomer.Values.OrderByDescending(r => r.Bucket90Plus + r.Bucket61To90).ToList()
        });
    }

    public async Task<ApiResponse<CustomerArAgingDto>> ForCustomerAsync(Guid customerId, DateTime? asOf = null)
    {
        var customer = await _uow.Repository<Customer>().GetByIdAsync(customerId);
        if (customer is null) return ApiResponse<CustomerArAgingDto>.Fail(404, "Customer not found.");

        var cutoff = asOf ?? DateTime.UtcNow;

        var invoices = await _uow.Repository<Invoice>().Query()
            .Where(i => i.CustomerId == customerId
                        && i.Status != InvoiceStatus.Void
                        && i.Total - i.AmountPaid > 0)
            .AsNoTracking()
            .ToListAsync();

        var row = new CustomerArAgingDto
        {
            CustomerId = customer.Id,
            CustomerCode = customer.Code,
            CustomerName = customer.TradeName ?? customer.LegalName,
            CurrentAr = customer.CurrentAr
        };

        foreach (var inv in invoices)
        {
            var outstanding = inv.Total - inv.AmountPaid;
            var daysOverdue = (cutoff - inv.DueAt).TotalDays;
            if (daysOverdue <= 30) row.Bucket0To30 += outstanding;
            else if (daysOverdue <= 60) row.Bucket31To60 += outstanding;
            else if (daysOverdue <= 90) row.Bucket61To90 += outstanding;
            else row.Bucket90Plus += outstanding;
        }

        return ApiResponse<CustomerArAgingDto>.Ok(row);
    }
}
