using Almajd.Application.DTOs.Billing;
using Almajd.Domain.Entities;
using AutoMapper;

namespace Almajd.Application.Common.Mappings;

public class BillingMappingProfile : Profile
{
    public BillingMappingProfile()
    {
        CreateMap<Invoice, InvoiceListItemDto>()
            .ForMember(d => d.CustomerCode, o => o.MapFrom(s => s.Customer.Code))
            .ForMember(d => d.CustomerName, o => o.MapFrom(s => s.Customer.TradeName ?? s.Customer.LegalName))
            .ForMember(d => d.Outstanding, o => o.MapFrom(s => s.Total - s.AmountPaid))
            .ForMember(d => d.DaysOverdue,
                o => o.MapFrom(s => DateTime.UtcNow > s.DueAt && (s.Total - s.AmountPaid) > 0
                    ? (int)(DateTime.UtcNow - s.DueAt).TotalDays
                    : 0));

        CreateMap<Invoice, InvoiceDto>()
            .ForMember(d => d.CustomerCode, o => o.MapFrom(s => s.Customer.Code))
            .ForMember(d => d.CustomerName, o => o.MapFrom(s => s.Customer.TradeName ?? s.Customer.LegalName))
            .ForMember(d => d.OrderNumber, o => o.MapFrom(s => s.Order != null ? s.Order.Number : null))
            .ForMember(d => d.ShipmentNumber, o => o.MapFrom(s => s.Shipment != null ? s.Shipment.Number : null))
            .ForMember(d => d.Outstanding, o => o.MapFrom(s => s.Total - s.AmountPaid))
            .ForMember(d => d.DaysOverdue,
                o => o.MapFrom(s => DateTime.UtcNow > s.DueAt && (s.Total - s.AmountPaid) > 0
                    ? (int)(DateTime.UtcNow - s.DueAt).TotalDays
                    : 0));

        CreateMap<InvoiceLine, InvoiceLineDto>()
            .ForMember(d => d.SkuCode, o => o.MapFrom(s => s.Sku.Code));

        CreateMap<Payment, PaymentDto>()
            .ForMember(d => d.CustomerName, o => o.MapFrom(s => s.Customer.TradeName ?? s.Customer.LegalName))
            .ForMember(d => d.RecordedByName,
                o => o.MapFrom(s => s.RecordedBy != null ? s.RecordedBy.FullName ?? s.RecordedBy.Email : null))
            .ForMember(d => d.AllocatedAmount, o => o.MapFrom(s => s.Allocations.Sum(a => a.Amount)))
            .ForMember(d => d.Unallocated, o => o.MapFrom(s => s.Amount - s.Allocations.Sum(a => a.Amount)));

        CreateMap<PaymentAllocation, PaymentAllocationDto>()
            .ForMember(d => d.InvoiceNumber, o => o.MapFrom(s => s.Invoice.Number));

        CreateMap<CreditNote, CreditNoteDto>()
            .ForMember(d => d.InvoiceNumber, o => o.MapFrom(s => s.Invoice.Number))
            .ForMember(d => d.IssuedByName,
                o => o.MapFrom(s => s.IssuedBy != null ? s.IssuedBy.FullName ?? s.IssuedBy.Email : null));
    }
}
