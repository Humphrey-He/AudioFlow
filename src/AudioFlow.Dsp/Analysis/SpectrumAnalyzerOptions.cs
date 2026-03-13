namespace AudioFlow.Dsp.Analysis;

public sealed class SpectrumAnalyzerOptions
{
    public int FftSize { get; init; } = 1024;
    public int ZeroPaddingFactor { get; init; } = 1;
    public Windowing.WindowFunctionType WindowFunction { get; init; } = Windowing.WindowFunctionType.Hann;
    public bool IncludePhase { get; init; } = true;
}
