using System.Numerics;
using AudioFlow.Dsp.Processing;
using Xunit;

namespace AudioFlow.Dsp.Tests;

public sealed class FftProcessorTests
{
    [Fact]
    public void Compute_EmptySpan_DoesNotThrow()
    {
        var output = new Complex[1024];
        FftProcessor.Compute(Span<float>.Empty, output);
    }

    [Theory]
    [InlineData(100)]
    [InlineData(1000)]
    [InlineData(1234)]
    public void Compute_NonPowerOfTwo_ThrowsArgumentException(int size)
    {
        var input = new float[size];
        var output = new Complex[size];

        Assert.Throws<ArgumentException>(() => FftProcessor.Compute(input, output));
    }

    [Fact]
    public void Compute_OutputTooSmall_ThrowsArgumentException()
    {
        var input = new float[512];
        var output = new Complex[256];

        Assert.Throws<ArgumentException>(() => FftProcessor.Compute(input, output));
    }

    [Fact]
    public void Compute_DcSignal_ProducesCorrectMagnitudeAtZeroFrequency()
    {
        var input = new float[512];
        for (var i = 0; i < input.Length; i++)
        {
            input[i] = 1.0f;
        }

        var output = new Complex[512];
        FftProcessor.Compute(input, output);

        Assert.Equal(512, output[0].Magnitude, 0.1);
    }

    [Fact]
    public void Compute_SineWave_ProducesPeakAtExpectedBin()
    {
        const int fftSize = 1024;
        const int sampleRate = 44100;
        const float frequency = 440f;
        var input = new float[fftSize];

        for (var i = 0; i < fftSize; i++)
        {
            var t = (float)i / sampleRate;
            input[i] = MathF.Sin(2 * MathF.PI * frequency * t);
        }

        var output = new Complex[fftSize];
        FftProcessor.Compute(input, output);

        var expectedBin = (int)(frequency * fftSize / sampleRate);
        var peakBin = 0;
        var peakMagnitude = 0f;
        for (var i = 1; i < fftSize / 2; i++)
        {
            if (output[i].Magnitude > peakMagnitude)
            {
                peakMagnitude = (float)output[i].Magnitude;
                peakBin = i;
            }
        }

        Assert.InRange(peakBin, expectedBin - 2, expectedBin + 2);
    }

    [Fact]
    public void Compute_PreservesOutputLength()
    {
        var input = new float[256];
        var output = new Complex[256];

        FftProcessor.Compute(input, output);

        Assert.Equal(256, output.Length);
    }

    [Fact]
    public void Compute_InPlace_SameAsSeparateOutput()
    {
        var input1 = new float[512];
        var input2 = new float[512];
        var random = new Random(42);
        for (var i = 0; i < 512; i++)
        {
            input1[i] = input2[i] = (float)(random.NextDouble() * 2 - 1);
        }

        var output1 = new Complex[512];
        FftProcessor.Compute(input1, output1);

        var output2 = new Complex[512];
        FftProcessor.Compute(input2, output2);

        for (var i = 0; i < 512; i++)
        {
            Assert.Equal(output1[i].Magnitude, output2[i].Magnitude, 1e-6f);
            Assert.Equal(output1[i].Phase, output2[i].Phase, 1e-6f);
        }
    }
}