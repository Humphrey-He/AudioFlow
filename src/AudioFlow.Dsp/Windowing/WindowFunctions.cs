namespace AudioFlow.Dsp.Windowing;

public static class WindowFunctions
{
    public static void ApplyInPlace(Span<float> samples, WindowFunctionType type)
    {
        var n = samples.Length;
        if (n == 0)
        {
            return;
        }

        for (var i = 0; i < n; i++)
        {
            var multiplier = type switch
            {
                WindowFunctionType.Hann => 0.5f * (1f - MathF.Cos(2f * MathF.PI * i / (n - 1))),
                WindowFunctionType.Hamming => 0.54f - 0.46f * MathF.Cos(2f * MathF.PI * i / (n - 1)),
                WindowFunctionType.Blackman => 0.42f - 0.5f * MathF.Cos(2f * MathF.PI * i / (n - 1))
                                              + 0.08f * MathF.Cos(4f * MathF.PI * i / (n - 1)),
                _ => 1f
            };

            samples[i] *= multiplier;
        }
    }
}
