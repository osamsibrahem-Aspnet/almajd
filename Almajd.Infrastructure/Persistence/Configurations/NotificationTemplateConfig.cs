using Almajd.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Almajd.Infrastructure.Persistence.Configurations;

public class NotificationTemplateConfig : IEntityTypeConfiguration<NotificationTemplate>
{
    public void Configure(EntityTypeBuilder<NotificationTemplate> builder)
    {
        builder.Property(t => t.Code).IsRequired().HasMaxLength(64);
        builder.Property(t => t.Category).HasConversion<string>().HasMaxLength(32);
        builder.Property(t => t.Title).IsRequired().HasMaxLength(256);
        builder.Property(t => t.Body).IsRequired().HasMaxLength(4000);

        builder.HasIndex(t => t.Code).IsUnique();
        builder.HasIndex(t => t.Category);
    }
}
