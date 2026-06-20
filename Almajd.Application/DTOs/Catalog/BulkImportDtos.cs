namespace Almajd.Application.DTOs.Catalog;

public class BulkImportRowErrorDto
{
    public int Row { get; set; }
    public string Message { get; set; } = default!;
}

public class BulkImportResultDto
{
    public int TotalRows { get; set; }
    public int Imported { get; set; }
    public int Skipped { get; set; }
    public IReadOnlyList<BulkImportRowErrorDto> Errors { get; set; } = Array.Empty<BulkImportRowErrorDto>();
}
