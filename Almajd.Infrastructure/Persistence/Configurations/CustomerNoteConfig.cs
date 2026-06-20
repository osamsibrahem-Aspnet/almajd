using Almajd.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Almajd.Infrastructure.Persistence.Configurations;

public class CustomerNoteConfig : IEntityTypeConfiguration<CustomerNote>
{
    public void Configure(EntityTypeBuilder<CustomerNote> builder)
    {
        builder.Property(n => n.Body).IsRequired().HasMaxLength(4000);

        builder.HasIndex(n => new { n.CustomerId, n.CreatedAt });

        builder
            .HasOne(n => n.Customer)
            .WithMany(c => c.Notes)
            .HasForeignKey(n => n.CustomerId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasOne(n => n.AuthorUser)
            .WithMany()
            .HasForeignKey(n => n.AuthorUserId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
