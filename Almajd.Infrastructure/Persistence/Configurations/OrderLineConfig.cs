using Almajd.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Almajd.Infrastructure.Persistence.Configurations;

public class OrderLineConfig : IEntityTypeConfiguration<OrderLine>
{
    public void Configure(EntityTypeBuilder<OrderLine> builder)
    {
        builder.Property(l => l.UnitPrice).HasColumnType("decimal(18,2)");
        builder.Property(l => l.DiscountPct).HasColumnType("decimal(5,2)");
        builder.Property(l => l.TaxPct).HasColumnType("decimal(5,2)");

        builder.Property(l => l.LineSubTotal).HasColumnType("decimal(18,2)");
        builder.Property(l => l.LineDiscountAmount).HasColumnType("decimal(18,2)");
        builder.Property(l => l.LineNet).HasColumnType("decimal(18,2)");
        builder.Property(l => l.LineTaxAmount).HasColumnType("decimal(18,2)");
        builder.Property(l => l.LineTotal).HasColumnType("decimal(18,2)");

        builder.Property(l => l.PriceSource).HasMaxLength(64);

        builder.HasIndex(l => new { l.OrderId, l.SkuId });

        builder
            .HasOne(l => l.Order)
            .WithMany(o => o.Lines)
            .HasForeignKey(l => l.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasOne(l => l.Sku)
            .WithMany()
            .HasForeignKey(l => l.SkuId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne(l => l.ReservedFromLocation)
            .WithMany()
            .HasForeignKey(l => l.ReservedFromLocationId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
