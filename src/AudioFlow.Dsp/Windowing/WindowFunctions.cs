namespace AudioFlow.Dsp.Windowing;

public static class WindowFunctions
{
    public static void ApplyInPlace(Span<float> samples, WindowFunctionType type, float kaiserBeta = 6.0f)
    {
        var n = samples.Length;
        if (n == 0)
        {
            return;
        }

        var denom = 1f / (n - 1);
        for (var i = 0; i < n; i++)
        {
            var multiplier = type switch
            {
                WindowFunctionType.Hann => 0.5f * (1f - MathF.Cos(2f * MathF.PI * i * denom)),
                WindowFunctionType.Hamming => 0.54f - 0.46f * MathF.Cos(2f * MathF.PI * i * denom),
                WindowFunctionType.Blackman => 0.42f - 0.5f * MathF.Cos(2f * MathF.PI * i * denom)
                                              + 0.08f * MathF.Cos(4f * MathF.PI * i * denom),
                WindowFunctionType.Kaiser => Kaiser(i, n, kaiserBeta),
                _ => 1f
            };

            samples[i] *= multiplier;
        }
    }

    private static float Kaiser(int index, int size, float beta)
    {
        var n = size - 1;
        var ratio = 2f * index / n - 1f;
        var value = beta * MathF.Sqrt(1f - ratio * ratio);
        return BesselI0(value) / BesselI0(beta);
    }

    private static float BesselI0(float x)
    {
        var sum = 1f;
        var y = x * x / 4f;
        var term = 1f;
        for (var k = 1; k < 10; k++)
        {
            term *= y / (k * k);
            sum += term;
        }

        return sum;
    }
}
