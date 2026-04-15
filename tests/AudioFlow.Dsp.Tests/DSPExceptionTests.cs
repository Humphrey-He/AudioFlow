using AudioFlow.Dsp.Exceptions;
using Xunit;

namespace AudioFlow.Dsp.Tests;

public sealed class DSPExceptionTests
{
    [Fact]
    public void FromInvalidFftSize_ContainsCorrectMessage()
    {
        var ex = DSPException.FromInvalidFftSize(100);

        Assert.Equal(DSPErrorCode.InvalidFftSize, ex.ErrorCode);
        Assert.Contains("100", ex.Message);
        Assert.Contains("power of two", ex.Message);
    }

    [Fact]
    public void FromInvalidSampleRate_ContainsCorrectMessage()
    {
        var ex = DSPException.FromInvalidSampleRate(0);

        Assert.Equal(DSPErrorCode.InvalidSampleRate, ex.ErrorCode);
        Assert.Contains("0", ex.Message);
    }

    [Fact]
    public void FromInputLengthMismatch_ContainsLengths()
    {
        var ex = DSPException.FromInputLengthMismatch(expected: 1024, actual: 512);

        Assert.Equal(DSPErrorCode.InputLengthMismatch, ex.ErrorCode);
        Assert.Contains("1024", ex.Message);
        Assert.Contains("512", ex.Message);
    }

    [Fact]
    public void FromNumericOverflow_ContainsOperationName()
    {
        var ex = DSPException.FromNumericOverflow("FFT");

        Assert.Equal(DSPErrorCode.NumericOverflow, ex.ErrorCode);
        Assert.Contains("FFT", ex.Message);
    }

    [Fact]
    public void Constructor_WithInnerException_PreservesStackTrace()
    {
        var inner = new InvalidOperationException("Inner");
        var ex = new DSPException(DSPErrorCode.Unknown, "Test", inner);

        Assert.Same(inner, ex.InnerException);
    }
}