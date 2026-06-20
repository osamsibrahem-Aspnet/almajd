using Almajd.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Almajd.Infrastructure.Persistence.Configurations;

public class GoodsReceiptConfig : IEntityTypeConfiguration<GoodsReceipt>
{
    public void Configure(EntityTypeBuilder<GoodsReceipt> builder)
    {
        builder.Property(g => g.Number).IsRequired().HasMaxLength(32);
        builder.Property(g => g.Notes).HasMaxLength(2000);

        builder.HasIndex(g => g.Number).IsUnique();
        builder.HasIndex(g => new { g.PurchaseOrderId, g.ReceivedAt });

        builder
            .HasOne(g => g.PurchaseOrder)
            .WithMany()
            .HasForeignKey(g => g.PurchaseOrderId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne(g => g.ReceivedBy)
            .WithMany()
            .HasForeignKey(g => g.ReceivedByUserId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
