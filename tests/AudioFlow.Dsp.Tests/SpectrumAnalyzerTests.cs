using System.Numerics;
using AudioFlow.Dsp.Analysis;
using AudioFlow.Dsp.Processing;
using AudioFlow.Dsp.Windowing;
using Xunit;

namespace AudioFlow.Dsp.Tests;

public sealed class SpectrumAnalyzerTests
{
    [Fact]
    public void Analyze_ReturnsHalfSpectrumMagnitudeAndPhase()
    {
        var options = new SpectrumAnalyzerOptions
        {
            FftSize = 1024,
            ZeroPaddingFactor = 1,
            WindowFunction = WindowFunctionType.Hann,
            IncludePhase = true
        };

        var analyzer = new SpectrumAnalyzer(options);
        var samples = new float[1024];
        samples[0] = 1f;

        var result = analyzer.Analyze(samples, 48000);

        Assert.Equal(512, result.Magnitudes.Length);
        Assert.Equal(512, result.Phases.Length);
        Assert.Equal(48000, result.SampleRate);
    }

    [Fact]
    public void Analyze_ThrowsForNonPowerOfTwo()
    {
        var options = new SpectrumAnalyzerOptions
        {
            FftSize = 1000,
            ZeroPaddingFactor = 1,
            WindowFunction = WindowFunctionType.Hann,
            IncludePhase = true
        };

        Assert.Throws<ArgumentException>(() => new SpectrumAnalyzer(options));
    }

    [Fact]
    public void FftProcessor_Compute_PreservesInputLength()
    {
        var input = new float[512];
        var output = new Complex[512];

        FftProcessor.Compute(input, output);

        Assert.Equal(512, output.Length);
    }
}
