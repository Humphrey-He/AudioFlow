using System.Numerics;
using AudioFlow.Dsp.Windowing;

namespace AudioFlow.Dsp.Processing;

public sealed class FftSpectrumAnalyzer
{
    public float[] Analyze(ReadOnlySpan<float> samples, WindowFunctionType window)
    {
        var length = samples.Length;
        if (length == 0)
        {
            return Array.Empty<float>();
        }

        if ((length & (length - 1)) != 0)
        {
            throw new ArgumentException("Sample count must be a power of two.", nameof(samples));
        }

        var windowed = new float[length];
        samples.CopyTo(windowed);
        WindowFunctions.ApplyInPlace(windowed, window);

        var spectrum = new Complex[length];
        FftProcessor.Compute(windowed, spectrum);

        var bins = length / 2;
        var magnitudes = new float[bins];
        for (var i = 0; i < bins; i++)
        {
            magnitudes[i] = (float)spectrum[i].Magnitude;
        }

        return magnitudes;
    }
}
