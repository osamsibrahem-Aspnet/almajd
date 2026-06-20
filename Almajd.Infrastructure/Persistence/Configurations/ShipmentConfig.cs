using Almajd.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Almajd.Infrastructure.Persistence.Configurations;

public class ShipmentConfig : IEntityTypeConfiguration<Shipment>
{
    public void Configure(EntityTypeBuilder<Shipment> builder)
    {
        builder.Property(s => s.Number).IsRequired().HasMaxLength(32);
        builder.Property(s => s.Status).HasConversion<string>().HasMaxLength(32);
        builder.Property(s => s.Carrier).HasMaxLength(128);
        builder.Property(s => s.Waybill).HasMaxLength(128);
        builder.Property(s => s.DriverName).HasMaxLength(128);
        builder.Property(s => s.DriverPhone).HasMaxLength(32);
        builder.Property(s => s.PodUrl).HasMaxLength(1024);
        builder.Property(s => s.PodSignerName).HasMaxLength(128);
        builder.Property(s => s.Notes).HasMaxLength(2000);

        builder.HasIndex(s => s.Number).IsUnique();
        builder.HasIndex(s => s.OrderId).IsUnique();
        builder.HasIndex(s => new { s.Status, s.DispatchedAt });

        builder
            .HasOne(s => s.Order)
            .WithOne()
            .HasForeignKey<Shipment>(s => s.OrderId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
