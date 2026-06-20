using Almajd.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Almajd.Infrastructure.Persistence.Configurations;

public class PickListLineConfig : IEntityTypeConfiguration<PickListLine>
{
    public void Configure(EntityTypeBuilder<PickListLine> builder)
    {
        builder.Property(l => l.ShortReason).HasMaxLength(512);

        builder.HasIndex(l => new { l.PickListId, l.OrderLineId }).IsUnique();
        builder.HasIndex(l => l.LocationId);

        builder
            .HasOne(l => l.PickList)
            .WithMany(p => p.Lines)
            .HasForeignKey(l => l.PickListId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasOne(l => l.OrderLine)
            .WithMany()
            .HasForeignKey(l => l.OrderLineId)
            .OnDelete(DeleteBehavior.Restrict);

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
