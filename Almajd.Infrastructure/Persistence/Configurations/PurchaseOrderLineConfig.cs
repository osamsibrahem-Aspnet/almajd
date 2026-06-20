using Almajd.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Almajd.Infrastructure.Persistence.Configurations;

public class PurchaseOrderLineConfig : IEntityTypeConfiguration<PurchaseOrderLine>
{
    public void Configure(EntityTypeBuilder<PurchaseOrderLine> builder)
    {
        builder.Property(l => l.CostPrice).HasColumnType("decimal(18,2)");

        builder.Ignore(l => l.LineTotal);
        builder.Ignore(l => l.IsFullyReceived);

        builder.HasIndex(l => new { l.PurchaseOrderId, l.SkuId });

        builder
            .HasOne(l => l.PurchaseOrder)
            .WithMany(o => o.Lines)
            .HasForeignKey(l => l.PurchaseOrderId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasOne(l => l.Sku)
            .WithMany()
            .HasForeignKey(l => l.SkuId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
