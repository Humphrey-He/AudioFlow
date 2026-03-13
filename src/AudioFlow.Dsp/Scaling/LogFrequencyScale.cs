namespace AudioFlow.Dsp.Scaling;

public static class LogFrequencyScale
{
    public static void ApplyInPlace(Span<float> magnitudes)
    {
        if (magnitudes.Length == 0)
        {
            return;
        }

        for (var i = 0; i < magnitudes.Length; i++)
        {
            magnitudes[i] = MathF.Log10(1f + magnitudes[i]);
        }
    }
}
