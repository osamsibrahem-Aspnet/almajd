using Almajd.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Almajd.Infrastructure.Persistence.Configurations;

public class InvoiceConfig : IEntityTypeConfiguration<Invoice>
{
    public void Configure(EntityTypeBuilder<Invoice> builder)
    {
        builder.Property(i => i.Number).IsRequired().HasMaxLength(32);
        builder.Property(i => i.Status).HasConversion<string>().HasMaxLength(32);
        builder.Property(i => i.Currency).IsRequired().HasMaxLength(8);

        builder.Property(i => i.SubTotal).HasColumnType("decimal(18,2)");
        builder.Property(i => i.DiscountTotal).HasColumnType("decimal(18,2)");
        builder.Property(i => i.TaxTotal).HasColumnType("decimal(18,2)");
        builder.Property(i => i.Total).HasColumnType("decimal(18,2)");
        builder.Property(i => i.AmountPaid).HasColumnType("decimal(18,2)");

        builder.Property(i => i.ShipToAddressSnapshot).HasMaxLength(1024);
        builder.Property(i => i.Notes).HasMaxLength(2000);
        builder.Property(i => i.VoidReason).HasMaxLength(512);

        builder.Ignore(i => i.Outstanding);

        builder.HasIndex(i => i.Number).IsUnique();
        builder.HasIndex(i => new { i.CustomerId, i.Status, i.DueAt });
        builder.HasIndex(i => new { i.Status, i.DueAt });

        builder
            .HasOne(i => i.Customer)
            .WithMany()
            .HasForeignKey(i => i.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne(i => i.Order)
            .WithMany()
            .HasForeignKey(i => i.OrderId)
            .OnDelete(DeleteBehavior.SetNull);

        builder
            .HasOne(i => i.Shipment)
            .WithMany()
            .HasForeignKey(i => i.ShipmentId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
