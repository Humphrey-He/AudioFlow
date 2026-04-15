using System.Numerics;
using AudioFlow.Dsp.Windowing;

namespace AudioFlow.Dsp.Analysis;

public sealed class SpectrumAnalyzer
{
    private readonly Complex[] _fftBuffer;
    private readonly float[] _windowBuffer;
    private readonly int _fftSize;
    private readonly int _paddedSize;
    private readonly WindowFunctionType _windowFunction;
    private readonly bool _includePhase;

    public SpectrumAnalyzer(SpectrumAnalyzerOptions options)
    {
        _fftSize = options.FftSize;
        if ((_fftSize & (_fftSize - 1)) != 0)
        {
            throw new ArgumentException("FFT size must be a power of two.", nameof(options));
        }

        if (options.ZeroPaddingFactor < 1 || (options.ZeroPaddingFactor & (options.ZeroPaddingFactor - 1)) != 0)
        {
            throw new ArgumentException("Zero padding factor must be a power of two.", nameof(options));
        }

        _paddedSize = _fftSize * options.ZeroPaddingFactor;
        _windowFunction = options.WindowFunction;
        _includePhase = options.IncludePhase;

        _fftBuffer = new Complex[_paddedSize];
        _windowBuffer = new float[_fftSize];
    }

    public int FftSize => _fftSize;
    public int PaddedSize => _paddedSize;

    public SpectrumResult Analyze(ReadOnlySpan<float> samples, int sampleRate)
    {
        if (samples.Length < _fftSize)
        {
            throw new ArgumentException("Not enough samples for FFT.", nameof(samples));
        }

        samples.Slice(0, _fftSize).CopyTo(_windowBuffer);
        WindowFunctions.ApplyInPlace(_windowBuffer, _windowFunction);

        for (var i = 0; i < _paddedSize; i++)
        {
            _fftBuffer[i] = i < _fftSize ? new Complex(_windowBuffer[i], 0d) : Complex.Zero;
        }

        Processing.FftProcessor.Compute(_fftBuffer, _paddedSize);

        var bins = _paddedSize / 2;
        var magnitudes = new float[bins];
        var phases = _includePhase ? new float[bins] : Array.Empty<float>();

        for (var i = 0; i < bins; i++)
        {
            var value = _fftBuffer[i];
            var magnitude = (float)value.Magnitude;
            // Convert linear magnitude to dB scale (20 * log10)
            // Floor at -180dB (below human hearing threshold)
            magnitudes[i] = magnitude > 1e-9f ? 20f * MathF.Log10(magnitude) : -180f;
            if (_includePhase)
            {
                phases[i] = (float)Math.Atan2(value.Imaginary, value.Real);
            }
        }

        return new SpectrumResult(magnitudes, phases, sampleRate, DateTime.UtcNow);
    }
}
