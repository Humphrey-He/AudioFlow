namespace AudioFlow.Dsp.Exceptions;

/// <summary>
/// DSP processing error codes.
/// </summary>
public enum DSPErrorCode
{
    /// <summary>FFT size is not a power of two.</summary>
    InvalidFftSize = 1,

    /// <summary>Sample rate is out of supported range.</summary>
    InvalidSampleRate = 2,

    /// <summary>Input data length mismatch.</summary>
    InputLengthMismatch = 3,

    /// <summary>Window function type not supported.</summary>
    UnsupportedWindowFunction = 4,

    /// <summary>Frequency weighting type not supported.</summary>
    UnsupportedWeightingType = 5,

    /// <summary>Smoothing algorithm configuration error.</summary>
    InvalidSmoothingConfig = 6,

    /// <summary>Numeric overflow in DSP computation.</summary>
    NumericOverflow = 7,

    /// <summary>Unknown DSP error.</summary>
    Unknown = 99
}

/// <summary>
/// Exception thrown during DSP processing operations.
/// </summary>
public sealed class DSPException : Exception
{
    public DSPErrorCode ErrorCode { get; }

    public DSPException(DSPErrorCode code, string message)
        : base(message)
    {
        ErrorCode = code;
    }

    public DSPException(DSPErrorCode code, string message, Exception innerException)
        : base(message, innerException)
    {
        ErrorCode = code;
    }

    public static DSPException FromInvalidFftSize(int actualSize)
        => new(DSPErrorCode.InvalidFftSize,
            $"FFT size must be a power of two. Received: {actualSize}");

    public static DSPException FromInvalidSampleRate(int sampleRate)
        => new(DSPErrorCode.InvalidSampleRate,
            $"Sample rate must be positive. Received: {sampleRate}");

    public static DSPException FromInputLengthMismatch(int expected, int actual)
        => new(DSPErrorCode.InputLengthMismatch,
            $"Input length mismatch. Expected: {expected}, Actual: {actual}");

    public static DSPException FromNumericOverflow(string operation)
        => new(DSPErrorCode.NumericOverflow,
            $"Numeric overflow occurred during: {operation}");
}