using AudioFlow.Dsp.Analysis;
using AudioFlow.Dsp.Scaling;
using AudioFlow.Dsp.Smoothing;
using AudioFlow.Dsp.Weighting;

namespace AudioFlow.Dsp.Processing;

public sealed class SpectrumProcessor
{
    private readonly SpectrumAnalyzer _analyzer;
    private readonly FrequencyWeightingType _weightingType;
    private readonly SmoothingSettings _smoothingSettings;
    private readonly bool _logScale;
    private float[] _previous = Array.Empty<float>();

    public SpectrumProcessor(SpectrumAnalyzer analyzer, FrequencyWeightingType weightingType, SmoothingSettings smoothingSettings, bool logScale)
    {
        _analyzer = analyzer;
        _weightingType = weightingType;
        _smoothingSettings = smoothingSettings;
        _logScale = logScale;
    }

    public SpectrumResult Process(ReadOnlySpan<float> samples, int sampleRate)
    {
        var result = _analyzer.Analyze(samples, sampleRate);

        FrequencyWeighting.ApplyInPlace(result.Magnitudes, sampleRate, _weightingType);

        if (_logScale)
        {
            LogFrequencyScale.ApplyInPlace(result.Magnitudes, result.SampleRate, _analyzer.FftSize);
        }

        if (_previous.Length != result.Magnitudes.Length)
        {
            _previous = new float[result.Magnitudes.Length];
        }

        SpectrumSmoothing.ApplyInPlace(result.Magnitudes, _previous, _smoothingSettings);
        Array.Copy(result.Magnitudes, _previous, result.Magnitudes.Length);

        return result;
    }
}
