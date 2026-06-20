using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace Almajd.Application.Common;

public static class Slugger
{
    public static string ToSlug(string input)
    {
        if (string.IsNullOrWhiteSpace(input)) return string.Empty;

        var normalized = input.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder();

        foreach (var ch in normalized)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark)
                builder.Append(ch);
        }

        var ascii = builder.ToString().Normalize(NormalizationForm.FormC).ToLowerInvariant();
        ascii = Regex.Replace(ascii, @"[^a-z0-9؀-ۿ\s-]", "");
        ascii = Regex.Replace(ascii, @"\s+", "-").Trim('-');
        ascii = Regex.Replace(ascii, @"-+", "-");

        return ascii;
    }
}
