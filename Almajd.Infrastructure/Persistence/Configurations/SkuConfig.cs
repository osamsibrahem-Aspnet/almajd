using Almajd.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Almajd.Infrastructure.Persistence.Configurations;

public class SkuConfig : IEntityTypeConfiguration<Sku>
{
    public void Configure(EntityTypeBuilder<Sku> builder)
    {
        builder.Property(s => s.Code).IsRequired().HasMaxLength(64);
        builder.Property(s => s.Barcode).IsRequired().HasMaxLength(64);
        builder.Property(s => s.AttributesJson).HasColumnType("nvarchar(max)");
        builder.Property(s => s.AverageCost).HasColumnType("decimal(18,4)");

        builder.HasIndex(s => s.Code).IsUnique();
        builder.HasIndex(s => s.Barcode).IsUnique();

        builder
            .HasOne(s => s.Product)
            .WithMany(p => p.Skus)
            .HasForeignKey(s => s.ProductId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
