namespace Almajd.Application.Common;

public class ApiResponse<T>
{
    public bool IsSuccess { get; init; }
    public int StatusCode { get; init; }
    public string? Message { get; init; }
    public T? Data { get; init; }
    public IReadOnlyList<string>? Errors { get; init; }

    public static ApiResponse<T> Ok(T data, string? message = null) => new()
    {
        IsSuccess = true,
        StatusCode = 200,
        Message = message,
        Data = data
    };

    public static ApiResponse<T> Created(T data, string? message = null) => new()
    {
        IsSuccess = true,
        StatusCode = 201,
        Message = message,
        Data = data
    };

    public static ApiResponse<T> Fail(int statusCode, string message, IReadOnlyList<string>? errors = null) => new()
    {
        IsSuccess = false,
        StatusCode = statusCode,
        Message = message,
        Errors = errors
    };
}

public class ApiResponse : ApiResponse<object>
{
    public static ApiResponse Ok(string? message = null) => new()
    {
        IsSuccess = true,
        StatusCode = 200,
        Message = message
    };

    public static new ApiResponse Fail(int statusCode, string message, IReadOnlyList<string>? errors = null) => new()
    {
        IsSuccess = false,
        StatusCode = statusCode,
        Message = message,
        Errors = errors
    };
}
