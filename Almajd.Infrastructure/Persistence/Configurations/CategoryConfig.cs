using Almajd.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Almajd.Infrastructure.Persistence.Configurations;

public class CategoryConfig : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> builder)
    {
        builder.Property(c => c.Name).IsRequired().HasMaxLength(128);
        builder.Property(c => c.Slug).IsRequired().HasMaxLength(160);
        builder.Property(c => c.Description).HasMaxLength(1024);
        builder.Property(c => c.AttributeSchemaJson).HasColumnType("nvarchar(max)");

        builder.HasIndex(c => c.Slug).IsUnique();
        builder.HasIndex(c => new { c.ParentId, c.SortOrder });

        builder
            .HasOne(c => c.Parent)
            .WithMany(c => c.Children)
            .HasForeignKey(c => c.ParentId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
