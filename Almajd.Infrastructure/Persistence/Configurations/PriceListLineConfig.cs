using Almajd.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Almajd.Infrastructure.Persistence.Configurations;

public class PriceListLineConfig : IEntityTypeConfiguration<PriceListLine>
{
    public void Configure(EntityTypeBuilder<PriceListLine> builder)
    {
        builder.Property(l => l.UnitPrice).HasColumnType("decimal(18,2)");

        builder.HasIndex(l => new { l.PriceListId, l.SkuId }).IsUnique();
        builder.HasIndex(l => l.SkuId);

        builder
            .HasOne(l => l.PriceList)
            .WithMany(p => p.Lines)
            .HasForeignKey(l => l.PriceListId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasOne(l => l.Sku)
            .WithMany()
            .HasForeignKey(l => l.SkuId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
