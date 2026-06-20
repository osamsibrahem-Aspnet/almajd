using Almajd.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Almajd.Infrastructure.Persistence.Configurations;

public class CreditNoteConfig : IEntityTypeConfiguration<CreditNote>
{
    public void Configure(EntityTypeBuilder<CreditNote> builder)
    {
        builder.Property(c => c.Number).IsRequired().HasMaxLength(32);
        builder.Property(c => c.Amount).HasColumnType("decimal(18,2)");
        builder.Property(c => c.Currency).IsRequired().HasMaxLength(8);
        builder.Property(c => c.Reason).IsRequired().HasMaxLength(1024);

        builder.HasIndex(c => c.Number).IsUnique();
        builder.HasIndex(c => c.InvoiceId);

        builder
            .HasOne(c => c.Invoice)
            .WithMany()
            .HasForeignKey(c => c.InvoiceId)
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .HasOne(c => c.IssuedBy)
            .WithMany()
            .HasForeignKey(c => c.IssuedByUserId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
