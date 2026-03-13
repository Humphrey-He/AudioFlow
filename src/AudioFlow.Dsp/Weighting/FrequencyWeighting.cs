namespace AudioFlow.Dsp.Weighting;

public static class FrequencyWeighting
{
    public static void ApplyInPlace(Span<float> magnitudes, int sampleRate, FrequencyWeightingType type)
    {
        if (type == FrequencyWeightingType.Linear)
        {
            return;
        }

        var binCount = magnitudes.Length;
        var nyquist = sampleRate / 2.0;

        for (var i = 0; i < binCount; i++)
        {
            var frequency = (float)(i * nyquist / binCount);
            var gain = type == FrequencyWeightingType.A ? AWeighting(frequency) : CWeighting(frequency);
            magnitudes[i] *= gain;
        }
    }

    private static float AWeighting(float f)
    {
        if (f <= 0)
        {
            return 0f;
        }

        var f2 = f * f;
        var ra = (12200f * 12200f * f2 * f2)
                 / ((f2 + 20.6f * 20.6f)
                    * MathF.Sqrt((f2 + 107.7f * 107.7f) * (f2 + 737.9f * 737.9f))
                    * (f2 + 12200f * 12200f));
        var a = 20f * MathF.Log10(ra) + 2.0f;
        return MathF.Pow(10f, a / 20f);
    }

    private static float CWeighting(float f)
    {
        if (f <= 0)
        {
            return 0f;
        }

        var f2 = f * f;
        var rc = (12200f * 12200f * f2)
                 / ((f2 + 20.6f * 20.6f) * (f2 + 12200f * 12200f));
        var c = 20f * MathF.Log10(rc) + 0.06f;
        return MathF.Pow(10f, c / 20f);
    }
}
