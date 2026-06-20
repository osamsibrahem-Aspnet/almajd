using Almajd.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Almajd.Infrastructure.Persistence.Configurations;

public class InvoiceLineConfig : IEntityTypeConfiguration<InvoiceLine>
{
    public void Configure(EntityTypeBuilder<InvoiceLine> builder)
    {
        builder.Property(l => l.Description).IsRequired().HasMaxLength(512);

        builder.Property(l => l.UnitPrice).HasColumnType("decimal(18,2)");
        builder.Property(l => l.DiscountPct).HasColumnType("decimal(5,2)");
        builder.Property(l => l.TaxPct).HasColumnType("decimal(5,2)");

        builder.Property(l => l.LineSubTotal).HasColumnType("decimal(18,2)");
        builder.Property(l => l.LineDiscountAmount).HasColumnType("decimal(18,2)");
        builder.Property(l => l.LineNet).HasColumnType("decimal(18,2)");
        builder.Property(l => l.LineTaxAmount).HasColumnType("decimal(18,2)");
        builder.Property(l => l.LineTotal).HasColumnType("decimal(18,2)");

        builder.HasIndex(l => new { l.InvoiceId, l.SkuId });

        builder
            .HasOne(l => l.Invoice)
            .WithMany(i => i.Lines)
            .HasForeignKey(l => l.InvoiceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasOne(l => l.Sku)
            .WithMany()
            .HasForeignKey(l => l.SkuId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
