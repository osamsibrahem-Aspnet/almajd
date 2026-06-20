namespace Almajd.Application.Interfaces;

/// <summary>
/// Allocates the next invoice number for the given year. Implementations must guarantee
/// no gaps under concurrent issuance (database row-lock against a counter row).
///
/// The implementation MUST share the same DbContext as the calling IUnitOfWork so the
/// counter increment commits atomically with the new Invoice insert in a single transaction.
/// </summary>
public interface IInvoiceNumberGenerator
{
    Task<string> NextAsync(int year);
}
