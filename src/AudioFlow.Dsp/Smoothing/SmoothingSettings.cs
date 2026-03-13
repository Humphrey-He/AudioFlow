namespace AudioFlow.Dsp.Smoothing;

public sealed class SmoothingSettings
{
    public SmoothingType Type { get; init; } = SmoothingType.None;
    public float Attack { get; init; } = 0.6f;
    public float Decay { get; init; } = 0.2f;
    public float LerpFactor { get; init; } = 0.5f;
}
