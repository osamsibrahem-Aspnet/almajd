using Almajd.Application.Interfaces;
using Almajd.Domain.Entities;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Almajd.Infrastructure.Pdf;

public class InvoicePdfGenerator : IInvoicePdfGenerator
{
    static InvoicePdfGenerator()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public byte[] Generate(Invoice invoice)
    {
        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(40);
                page.DefaultTextStyle(x => x.FontSize(10).FontColor(Colors.Black));

                page.Header().Row(row =>
                {
                    row.RelativeItem().Column(col =>
                    {
                        col.Item().Text("ALMAJD").FontSize(20).Bold().FontColor("#059669");
                        col.Item().Text("B2B Commerce + ERP").FontSize(9).FontColor(Colors.Grey.Darken1);
                    });
                    row.ConstantItem(180).AlignRight().Column(col =>
                    {
                        col.Item().Text("INVOICE").FontSize(18).Bold();
                        col.Item().Text(invoice.Number).FontSize(12);
                        col.Item().Text($"Issued: {invoice.IssuedAt:yyyy-MM-dd}").FontSize(9);
                        col.Item().Text($"Due: {invoice.DueAt:yyyy-MM-dd}").FontSize(9);
                    });
                });

                page.Content().PaddingVertical(15).Column(col =>
                {
                    col.Spacing(10);

                    col.Item().Row(row =>
                    {
                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text("Bill To").Bold();
                            c.Item().Text(invoice.Customer?.TradeName ?? invoice.Customer?.LegalName ?? "—");
                            c.Item().Text(invoice.Customer?.LegalName ?? "").FontSize(9).FontColor(Colors.Grey.Darken1);
                            if (!string.IsNullOrWhiteSpace(invoice.Customer?.TaxId))
                                c.Item().Text($"Tax ID: {invoice.Customer.TaxId}").FontSize(9);
                        });
                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text("Ship To").Bold();
                            c.Item().Text(invoice.ShipToAddressSnapshot ?? "—");
                        });
                    });

                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(c =>
                        {
                            c.RelativeColumn(4);
                            c.RelativeColumn(1);
                            c.RelativeColumn(1.4f);
                            c.RelativeColumn(1);
                            c.RelativeColumn(1);
                            c.RelativeColumn(1.4f);
                        });

                        table.Header(h =>
                        {
                            h.Cell().Background("#DCFCE7").Padding(5).Text("Description").Bold();
                            h.Cell().Background("#DCFCE7").Padding(5).AlignRight().Text("Qty").Bold();
                            h.Cell().Background("#DCFCE7").Padding(5).AlignRight().Text("Unit").Bold();
                            h.Cell().Background("#DCFCE7").Padding(5).AlignRight().Text("Disc%").Bold();
                            h.Cell().Background("#DCFCE7").Padding(5).AlignRight().Text("Tax%").Bold();
                            h.Cell().Background("#DCFCE7").Padding(5).AlignRight().Text("Total").Bold();
                        });

                        foreach (var line in invoice.Lines)
                        {
                            table.Cell().BorderBottom(0.5f).BorderColor("#BBF7D0").Padding(4).Text(line.Description);
                            table.Cell().BorderBottom(0.5f).BorderColor("#BBF7D0").Padding(4).AlignRight().Text(line.Qty.ToString());
                            table.Cell().BorderBottom(0.5f).BorderColor("#BBF7D0").Padding(4).AlignRight().Text(line.UnitPrice.ToString("N2"));
                            table.Cell().BorderBottom(0.5f).BorderColor("#BBF7D0").Padding(4).AlignRight().Text(line.DiscountPct.ToString("N2"));
                            table.Cell().BorderBottom(0.5f).BorderColor("#BBF7D0").Padding(4).AlignRight().Text(line.TaxPct.ToString("N2"));
                            table.Cell().BorderBottom(0.5f).BorderColor("#BBF7D0").Padding(4).AlignRight().Text(line.LineTotal.ToString("N2"));
                        }
                    });

                    col.Item().AlignRight().Column(c =>
                    {
                        c.Item().Width(220).Row(r =>
                        {
                            r.RelativeItem().Text("Subtotal");
                            r.ConstantItem(80).AlignRight().Text(invoice.SubTotal.ToString("N2"));
                        });
                        c.Item().Width(220).Row(r =>
                        {
                            r.RelativeItem().Text("Discount");
                            r.ConstantItem(80).AlignRight().Text($"-{invoice.DiscountTotal:N2}");
                        });
                        c.Item().Width(220).Row(r =>
                        {
                            r.RelativeItem().Text("Tax");
                            r.ConstantItem(80).AlignRight().Text(invoice.TaxTotal.ToString("N2"));
                        });
                        c.Item().Width(220).BorderTop(1).PaddingTop(4).Row(r =>
                        {
                            r.RelativeItem().Text($"Total ({invoice.Currency})").Bold();
                            r.ConstantItem(80).AlignRight().Text(invoice.Total.ToString("N2")).Bold();
                        });
                        if (invoice.AmountPaid > 0)
                        {
                            c.Item().Width(220).Row(r =>
                            {
                                r.RelativeItem().Text("Paid");
                                r.ConstantItem(80).AlignRight().Text(invoice.AmountPaid.ToString("N2"));
                            });
                            c.Item().Width(220).Row(r =>
                            {
                                r.RelativeItem().Text("Outstanding").Bold();
                                r.ConstantItem(80).AlignRight().Text(invoice.Outstanding.ToString("N2")).Bold();
                            });
                        }
                    });

                    if (!string.IsNullOrWhiteSpace(invoice.Notes))
                    {
                        col.Item().PaddingTop(15).Column(c =>
                        {
                            c.Item().Text("Notes").Bold();
                            c.Item().Text(invoice.Notes).FontSize(9);
                        });
                    }
                });

                page.Footer().AlignCenter().Text(t =>
                {
                    t.Span("Page ").FontSize(8).FontColor(Colors.Grey.Darken1);
                    t.CurrentPageNumber().FontSize(8).FontColor(Colors.Grey.Darken1);
                    t.Span(" / ").FontSize(8).FontColor(Colors.Grey.Darken1);
                    t.TotalPages().FontSize(8).FontColor(Colors.Grey.Darken1);
                });
            });
        }).GeneratePdf();
    }
}
