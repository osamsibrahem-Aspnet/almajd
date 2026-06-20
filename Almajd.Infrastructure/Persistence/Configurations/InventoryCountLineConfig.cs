using Almajd.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Almajd.Infrastructure.Persistence.Configurations;

public class InventoryCountLineConfig : IEntityTypeConfiguration<InventoryCountLine>
{
    public void Configure(EntityTypeBuilder<InventoryCountLine> builder)
    {
        builder.Ignore(l => l.Variance); // computed property

        builder.HasIndex(l => new { l.CountId, l.SkuId, l.LocationId }).IsUnique();

        builder
            .HasOne(l => l.Count)
            .WithMany(c => c.Lines)
            .HasForeignKey(l => l.CountId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasOne(l => l.Sku)
            .WithMany()
            .HasForeignKey(l => l.SkuId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne(l => l.Location)
            .WithMany()
            .HasForeignKey(l => l.LocationId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
