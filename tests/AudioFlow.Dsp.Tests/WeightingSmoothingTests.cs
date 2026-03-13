using AudioFlow.Dsp.Smoothing;
using AudioFlow.Dsp.Weighting;
using Xunit;

namespace AudioFlow.Dsp.Tests;

public sealed class WeightingSmoothingTests
{
    [Fact]
    public void FrequencyWeighting_Linear_NoChanges()
    {
        var bins = new float[] { 1f, 2f, 3f };
        var copy = (float[])bins.Clone();

        FrequencyWeighting.ApplyInPlace(bins, 48000, FrequencyWeightingType.Linear);

        Assert.Equal(copy, bins);
    }

    [Fact]
    public void SpectrumSmoothing_Gravity_Interpolates()
    {
        var current = new float[] { 10f, 5f };
        var previous = new float[] { 0f, 10f };
        var settings = new SmoothingSettings { Type = SmoothingType.Gravity, Attack = 0.5f, Decay = 0.1f };

        SpectrumSmoothing.ApplyInPlace(current, previous, settings);

        Assert.True(current[0] > 0f && current[0] < 10f);
        Assert.True(current[1] < 10f && current[1] > 5f);
    }
}
