namespace AudioFlow.Dsp.Scaling;

/// <summary>
/// Maps linear frequency bins to logarithmically-spaced frequency points
/// for more perceptually-relevant visualization. Low frequencies get
/// higher resolution, matching human hearing characteristics.
/// </summary>
public static class LogFrequencyScale
{
    private const float MinFrequency = 20f;   // 20 Hz - lower limit of human hearing
    private const float MaxFrequency = 20000f; // 20 kHz - upper limit of human hearing

    /// <summary>
    /// Maps linear FFT bins to log-spaced frequency scale using interpolation.
    /// This redistributes bins so low frequencies occupy more visual space.
    /// </summary>
    /// <param name="magnitudes">Input/output magnitudes (modified in place)</param>
    /// <param name="sampleRate">Audio sample rate in Hz</param>
    /// <param name="fftSize">FFT size used to compute the spectrum</param>
    public static void ApplyInPlace(Span<float> magnitudes, int sampleRate, int fftSize)
    {
        if (magnitudes.Length == 0)
        {
            return;
        }

        var nyquist = sampleRate / 2f;
        var linearBinWidth = nyquist / magnitudes.Length;

        // Precompute log-spaced frequency points (in bin indices)
        var logBins = new float[magnitudes.Length];
        var logMin = MathF.Log10(MinFrequency);
        var logMax = MathF.Log10(MaxFrequency);
        var logRange = logMax - logMin;

        for (var i = 0; i < magnitudes.Length; i++)
        {
            // Log-spaced frequency for this bin
            var logFreq = logMin + (i / (float)(magnitudes.Length - 1)) * logRange;
            var freq = MathF.Pow(10f, logFreq);

            // Clamp to nyquist
            freq = Math.Min(freq, nyquist);

            // Convert frequency to linear bin index
            logBins[i] = freq / linearBinWidth;
        }

        // Interpolate from linear bins to log-spaced positions
        var result = new float[magnitudes.Length];

        for (var i = 0; i < magnitudes.Length; i++)
        {
            var binPos = logBins[i];

            if (binPos <= 0)
            {
                result[i] = magnitudes[0];
            }
            else if (binPos >= magnitudes.Length - 1)
            {
                result[i] = magnitudes[magnitudes.Length - 1];
            }
            else
            {
                // Linear interpolation between adjacent bins
                var binLow = (int)binPos;
                var binHigh = binLow + 1;
                var t = binPos - binLow;
                result[i] = magnitudes[binLow] * (1f - t) + magnitudes[binHigh] * t;
            }
        }

        // Copy back
        result.CopyTo(magnitudes);
    }

    /// <summary>
    /// Backwards-compatible overload that preserves existing behavior for
    /// code that doesn't have sample rate / FFT size available.
    /// Note: This is a no-op as true log frequency scaling requires
    /// sample rate and FFT size information.
    /// </summary>
    [System.Obsolete("Use overload with sampleRate and fftSize parameters for proper log frequency scaling.")]
    public static void ApplyInPlace(Span<float> magnitudes)
    {
        // No-op: true log frequency scaling requires sample rate and FFT size
    }
}
