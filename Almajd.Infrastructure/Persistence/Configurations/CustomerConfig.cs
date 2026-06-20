using Almajd.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Almajd.Infrastructure.Persistence.Configurations;

public class CustomerConfig : IEntityTypeConfiguration<Customer>
{
    public void Configure(EntityTypeBuilder<Customer> builder)
    {
        builder.Property(c => c.Code).IsRequired().HasMaxLength(32);
        builder.Property(c => c.LegalName).IsRequired().HasMaxLength(256);
        builder.Property(c => c.TradeName).HasMaxLength(256);
        builder.Property(c => c.TaxId).HasMaxLength(64);
        builder.Property(c => c.Phone).HasMaxLength(32);
        builder.Property(c => c.Email).HasMaxLength(256);

        builder.Property(c => c.Tier).HasConversion<string>().HasMaxLength(32);
        builder.Property(c => c.Status).HasConversion<string>().HasMaxLength(32);

        builder.Property(c => c.CreditLimit).HasColumnType("decimal(18,2)");
        builder.Property(c => c.CurrentAr).HasColumnType("decimal(18,2)");

        builder.Property(c => c.KycDocumentPath).HasMaxLength(1024);

        builder.HasIndex(c => c.Code).IsUnique();
        builder.HasIndex(c => c.LegalName);
        builder.HasIndex(c => new { c.Status, c.Tier });

        builder
            .HasOne(c => c.SalesRep)
            .WithMany()
            .HasForeignKey(c => c.SalesRepId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
