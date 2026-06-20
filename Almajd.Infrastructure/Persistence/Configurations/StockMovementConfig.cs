using Almajd.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Almajd.Infrastructure.Persistence.Configurations;

public class StockMovementConfig : IEntityTypeConfiguration<StockMovement>
{
    public void Configure(EntityTypeBuilder<StockMovement> builder)
    {
        builder.Property(m => m.Type).HasConversion<string>().HasMaxLength(32);
        builder.Property(m => m.ReferenceType).HasMaxLength(64);
        builder.Property(m => m.Notes).HasMaxLength(512);

        builder.HasIndex(m => new { m.SkuId, m.OccurredAt }).IsDescending(false, true);
        builder.HasIndex(m => new { m.ReferenceType, m.ReferenceId });
        builder.HasIndex(m => m.OccurredAt).IsDescending();

        builder
            .HasOne(m => m.Sku)
            .WithMany()
            .HasForeignKey(m => m.SkuId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne(m => m.FromLocation)
            .WithMany()
            .HasForeignKey(m => m.FromLocationId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne(m => m.ToLocation)
            .WithMany()
            .HasForeignKey(m => m.ToLocationId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
