using Almajd.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Almajd.Infrastructure.Persistence.Configurations;

public class DiscountCouponConfig : IEntityTypeConfiguration<DiscountCoupon>
{
    public void Configure(EntityTypeBuilder<DiscountCoupon> builder)
    {
        builder.Property(c => c.Code).IsRequired().HasMaxLength(64);
        builder.Property(c => c.Description).HasMaxLength(512);
        builder.Property(c => c.Type).HasConversion<string>().HasMaxLength(32);
        builder.Property(c => c.Value).HasColumnType("decimal(18,2)");

        builder.HasIndex(c => c.Code).IsUnique();
        builder.HasIndex(c => new { c.IsActive, c.ValidFrom, c.ValidTo });
    }
}
