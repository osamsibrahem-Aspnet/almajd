using Almajd.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Almajd.Infrastructure.Persistence.Configurations;

public class PaymentConfig : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> builder)
    {
        builder.Property(p => p.Number).IsRequired().HasMaxLength(32);
        builder.Property(p => p.Method).HasConversion<string>().HasMaxLength(32);
        builder.Property(p => p.Currency).IsRequired().HasMaxLength(8);
        builder.Property(p => p.Amount).HasColumnType("decimal(18,2)");
        builder.Property(p => p.Reference).HasMaxLength(128);
        builder.Property(p => p.Notes).HasMaxLength(2000);

        builder.Ignore(p => p.AllocatedAmount);
        builder.Ignore(p => p.Unallocated);

        builder.HasIndex(p => p.Number).IsUnique();
        builder.HasIndex(p => new { p.CustomerId, p.PaidAt });

        builder
            .HasOne(p => p.Customer)
            .WithMany()
            .HasForeignKey(p => p.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne(p => p.RecordedBy)
            .WithMany()
            .HasForeignKey(p => p.RecordedByUserId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
