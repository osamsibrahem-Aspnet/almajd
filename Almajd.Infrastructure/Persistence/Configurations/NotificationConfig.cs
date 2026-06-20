using Almajd.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Almajd.Infrastructure.Persistence.Configurations;

public class NotificationConfig : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.Property(n => n.TemplateCode).IsRequired().HasMaxLength(64);
        builder.Property(n => n.Category).HasConversion<string>().HasMaxLength(32);
        builder.Property(n => n.Channel).HasConversion<string>().HasMaxLength(32);
        builder.Property(n => n.Status).HasConversion<string>().HasMaxLength(32);
        builder.Property(n => n.Title).IsRequired().HasMaxLength(256);
        builder.Property(n => n.Body).IsRequired().HasMaxLength(4000);
        builder.Property(n => n.PayloadJson).HasColumnType("nvarchar(max)");
        builder.Property(n => n.Error).HasMaxLength(1024);

        builder.HasIndex(n => new { n.UserId, n.Status, n.CreatedAt });
        builder.HasIndex(n => new { n.Status, n.CreatedAt });

        builder
            .HasOne(n => n.User)
            .WithMany()
            .HasForeignKey(n => n.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
