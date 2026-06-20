using Almajd.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Almajd.Infrastructure.Persistence.Configurations;

public class OrderConfig : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.Property(o => o.Number).IsRequired().HasMaxLength(32);
        builder.Property(o => o.Status).HasConversion<string>().HasMaxLength(32);
        builder.Property(o => o.Channel).HasConversion<string>().HasMaxLength(32);
        builder.Property(o => o.Currency).IsRequired().HasMaxLength(8);

        builder.Property(o => o.SubTotal).HasColumnType("decimal(18,2)");
        builder.Property(o => o.LineDiscountTotal).HasColumnType("decimal(18,2)");
        builder.Property(o => o.CouponDiscountAmount).HasColumnType("decimal(18,2)");
        builder.Property(o => o.TaxTotal).HasColumnType("decimal(18,2)");
        builder.Property(o => o.Total).HasColumnType("decimal(18,2)");

        builder.Property(o => o.CancellationReason).HasMaxLength(512);
        builder.Property(o => o.Notes).HasMaxLength(2000);
        builder.Property(o => o.ShipToAddressSnapshot).HasMaxLength(1024);

        builder.HasIndex(o => o.Number).IsUnique();
        builder.HasIndex(o => new { o.CustomerId, o.Status });
        builder.HasIndex(o => new { o.Status, o.SubmittedAt });
        builder.HasIndex(o => o.ExpectedShipAt);

        builder
            .HasOne(o => o.Customer)
            .WithMany()
            .HasForeignKey(o => o.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne(o => o.ShipToAddress)
            .WithMany()
            .HasForeignKey(o => o.ShipToAddressId)
            .OnDelete(DeleteBehavior.SetNull);

        builder
            .HasOne(o => o.SalesRep)
            .WithMany()
            .HasForeignKey(o => o.SalesRepId)
            .OnDelete(DeleteBehavior.SetNull);

        builder
            .HasOne(o => o.Coupon)
            .WithMany()
            .HasForeignKey(o => o.CouponId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
