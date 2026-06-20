using Almajd.Application.Common;
using Almajd.Application.DTOs.Billing;
using Almajd.Application.Interfaces;
using Almajd.Domain.Entities;
using Almajd.Domain.Enums;
using AutoMapper;
using Microsoft.EntityFrameworkCore;

namespace Almajd.Application.Services;

public class CreditNoteService : ICreditNoteService
{
    private readonly IUnitOfWork _uow;
    private readonly IMapper _mapper;

    public CreditNoteService(IUnitOfWork uow, IMapper mapper)
    {
        _uow = uow;
        _mapper = mapper;
    }

    public async Task<ApiResponse<IReadOnlyList<CreditNoteDto>>> ListByInvoiceAsync(Guid invoiceId)
    {
        var items = await _uow.Repository<CreditNote>().Query()
            .Include(c => c.Invoice)
            .Include(c => c.IssuedBy)
            .Where(c => c.InvoiceId == invoiceId)
            .OrderByDescending(c => c.IssuedAt)
            .ToListAsync();

        return ApiResponse<IReadOnlyList<CreditNoteDto>>.Ok(items.Select(_mapper.Map<CreditNoteDto>).ToList());
    }

    public async Task<ApiResponse<CreditNoteDto>> CreateAsync(CreditNoteCreateDto dto, Guid? userId)
    {
        var invoice = await _uow.Repository<Invoice>().Query()
            .Include(i => i.Customer)
            .FirstOrDefaultAsync(i => i.Id == dto.InvoiceId);

        if (invoice is null) return ApiResponse<CreditNoteDto>.Fail(400, "Invoice not found.");
        if (invoice.Status == InvoiceStatus.Void)
            return ApiResponse<CreditNoteDto>.Fail(409, "Cannot credit a void invoice.");

        var totalExistingCredits = await _uow.Repository<CreditNote>().Query()
            .Where(c => c.InvoiceId == invoice.Id)
            .SumAsync(c => (decimal?)c.Amount) ?? 0;

        var remaining = invoice.Total - totalExistingCredits;
        if (dto.Amount > remaining)
            return ApiResponse<CreditNoteDto>.Fail(400,
                $"Credit amount {dto.Amount:N2} exceeds remaining creditable {remaining:N2} on invoice {invoice.Number}.");

        var creditNote = new CreditNote
        {
            Number = await NextCreditNoteNumberAsync(),
            InvoiceId = invoice.Id,
            IssuedAt = DateTime.UtcNow,
            Amount = dto.Amount,
            Currency = invoice.Currency,
            Reason = dto.Reason,
            IssuedByUserId = userId
        };

        // Reduce customer AR by the credited amount
        invoice.Customer.CurrentAr -= dto.Amount;
        if (invoice.Customer.CurrentAr < 0) invoice.Customer.CurrentAr = 0;

        await _uow.Repository<CreditNote>().AddAsync(creditNote);
        _uow.Repository<Customer>().Update(invoice.Customer);
        await _uow.CompleteAsync();

        var reloaded = await _uow.Repository<CreditNote>().Query()
            .Include(c => c.Invoice)
            .Include(c => c.IssuedBy)
            .FirstOrDefaultAsync(c => c.Id == creditNote.Id);

        return ApiResponse<CreditNoteDto>.Created(_mapper.Map<CreditNoteDto>(reloaded ?? creditNote));
    }

    private async Task<string> NextCreditNoteNumberAsync()
    {
        var year = DateTime.UtcNow.Year;
        var prefix = $"CN-{year}-";

        var last = await _uow.Repository<CreditNote>().Query()
            .Where(c => c.Number.StartsWith(prefix))
            .OrderByDescending(c => c.Number)
            .Select(c => c.Number)
            .FirstOrDefaultAsync();

        var next = 1;
        if (!string.IsNullOrWhiteSpace(last) && int.TryParse(last.AsSpan(prefix.Length), out var parsed))
            next = parsed + 1;

        return $"{prefix}{next:D6}";
    }
}
