using Almajd.Domain.Entities;

namespace Almajd.Application.Interfaces;

public interface IInvoicePdfGenerator
{
    byte[] Generate(Invoice invoice);
}
