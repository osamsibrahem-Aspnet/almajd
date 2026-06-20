using Almajd.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Almajd.Infrastructure.Persistence.Configurations;

public class PurchaseOrderConfig : IEntityTypeConfiguration<PurchaseOrder>
{
    public void Configure(EntityTypeBuilder<PurchaseOrder> builder)
    {
        builder.Property(p => p.Number).IsRequired().HasMaxLength(32);
        builder.Property(p => p.Status).HasConversion<string>().HasMaxLength(32);
        builder.Property(p => p.Currency).IsRequired().HasMaxLength(8);
        builder.Property(p => p.Total).HasColumnType("decimal(18,2)");
        builder.Property(p => p.CancellationReason).HasMaxLength(512);
        builder.Property(p => p.Notes).HasMaxLength(2000);

        builder.HasIndex(p => p.Number).IsUnique();
        builder.HasIndex(p => new { p.SupplierId, p.Status });
        builder.HasIndex(p => new { p.Status, p.ExpectedAt });

        builder
            .HasOne(p => p.Supplier)
            .WithMany()
            .HasForeignKey(p => p.SupplierId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne(p => p.ApprovedBy)
            .WithMany()
            .HasForeignKey(p => p.ApprovedByUserId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
