using AudioFlow.Dsp.Windowing;
using Xunit;

namespace AudioFlow.Dsp.Tests;

public sealed class WindowFunctionsTests
{
    [Fact]
    public void ApplyInPlace_EmptySpan_DoesNotThrow()
    {
        var samples = Array.Empty<float>();
        WindowFunctions.ApplyInPlace(samples, WindowFunctionType.Hann);
    }

    [Theory]
    [InlineData(WindowFunctionType.Hann)]
    [InlineData(WindowFunctionType.Hamming)]
    [InlineData(WindowFunctionType.Blackman)]
    [InlineData(WindowFunctionType.Kaiser)]
    public void ApplyInPlace_AllWindowTypes_DoNotThrow(WindowFunctionType type)
    {
        var samples = new float[1024];
        var random = new Random(42);
        for (var i = 0; i < samples.Length; i++)
        {
            samples[i] = (float)(random.NextDouble() * 2 - 1);
        }

        var exception = Record.Exception(() => WindowFunctions.ApplyInPlace(samples, type));
        Assert.Null(exception);
    }

    [Fact]
    public void ApplyInPlace_HannWindow_SumsToN()
    {
        var samples = new float[512];
        for (var i = 0; i < samples.Length; i++)
        {
            samples[i] = 1f;
        }

        WindowFunctions.ApplyInPlace(samples, WindowFunctionType.Hann);

        var sum = 0f;
        foreach (var s in samples)
        {
            sum += s;
        }

        Assert.Equal(256f, sum, 1f);
    }

    [Fact]
    public void ApplyInPlace_Kaiser_CustomBeta()
    {
        var samples = new float[256];
        for (var i = 0; i < samples.Length; i++)
        {
            samples[i] = 1f;
        }

        var exception = Record.Exception(() => WindowFunctions.ApplyInPlace(samples, WindowFunctionType.Kaiser, kaiserBeta: 10.0f));
        Assert.Null(exception);
    }
}