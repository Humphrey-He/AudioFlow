namespace AudioFlow.Dsp.Smoothing;

public static class SpectrumSmoothing
{
    public static void ApplyInPlace(Span<float> current, ReadOnlySpan<float> previous, SmoothingSettings settings)
    {
        if (settings.Type == SmoothingType.None || previous.Length == 0)
        {
            return;
        }

        var count = Math.Min(current.Length, previous.Length);
        for (var i = 0; i < count; i++)
        {
            var prev = previous[i];
            var curr = current[i];

            switch (settings.Type)
            {
                case SmoothingType.Gravity:
                {
                    var rate = curr > prev ? settings.Attack : settings.Decay;
                    current[i] = prev + (curr - prev) * rate;
                    break;
                }
                case SmoothingType.Lerp:
                    current[i] = prev + (curr - prev) * settings.LerpFactor;
                    break;
            }
        }
    }
}
