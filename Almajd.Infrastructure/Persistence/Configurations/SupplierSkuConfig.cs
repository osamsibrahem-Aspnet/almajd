using Almajd.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Almajd.Infrastructure.Persistence.Configurations;

public class SupplierSkuConfig : IEntityTypeConfiguration<SupplierSku>
{
    public void Configure(EntityTypeBuilder<SupplierSku> builder)
    {
        builder.Property(s => s.SupplierSkuCode).HasMaxLength(64);
        builder.Property(s => s.CostPrice).HasColumnType("decimal(18,2)");
        builder.Property(s => s.Currency).IsRequired().HasMaxLength(8);

        builder.HasIndex(s => new { s.SupplierId, s.SkuId }).IsUnique();
        builder.HasIndex(s => new { s.SkuId, s.IsPreferred });

        builder
            .HasOne(s => s.Supplier)
            .WithMany(sp => sp.SuppliedSkus)
            .HasForeignKey(s => s.SupplierId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasOne(s => s.Sku)
            .WithMany()
            .HasForeignKey(s => s.SkuId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
