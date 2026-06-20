using Almajd.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Almajd.Infrastructure.Persistence.Configurations;

public class PaymentAllocationConfig : IEntityTypeConfiguration<PaymentAllocation>
{
    public void Configure(EntityTypeBuilder<PaymentAllocation> builder)
    {
        builder.Property(a => a.Amount).HasColumnType("decimal(18,2)");

        builder.HasIndex(a => new { a.PaymentId, a.InvoiceId }).IsUnique();
        builder.HasIndex(a => a.InvoiceId);

        builder
            .HasOne(a => a.Payment)
            .WithMany(p => p.Allocations)
            .HasForeignKey(a => a.PaymentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasOne(a => a.Invoice)
            .WithMany()
            .HasForeignKey(a => a.InvoiceId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
