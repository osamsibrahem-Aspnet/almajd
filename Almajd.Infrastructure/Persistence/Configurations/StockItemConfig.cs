using Almajd.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Almajd.Infrastructure.Persistence.Configurations;

public class StockItemConfig : IEntityTypeConfiguration<StockItem>
{
    public void Configure(EntityTypeBuilder<StockItem> builder)
    {
        builder.Ignore(s => s.QtyAvailable); // computed property

        builder.HasIndex(s => new { s.SkuId, s.LocationId }).IsUnique();
        builder.HasIndex(s => s.SkuId);
        builder.HasIndex(s => s.LocationId);

        builder
            .HasOne(s => s.Sku)
            .WithMany()
            .HasForeignKey(s => s.SkuId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne(s => s.Location)
            .WithMany()
            .HasForeignKey(s => s.LocationId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.ToTable(t => t.HasCheckConstraint("CK_StockItem_OnHandGteReserved", "[QtyOnHand] >= [QtyReserved]"));
    }
}
