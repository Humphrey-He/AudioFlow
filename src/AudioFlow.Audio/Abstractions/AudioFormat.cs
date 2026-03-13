namespace AudioFlow.Audio.Abstractions;

/// <summary>
/// Audio format information.
/// </summary>
public sealed class AudioFormat
{
    public int SampleRate { get; init; }
    public int Channels { get; init; }
    public int BitDepth { get; init; }
    public bool IsFloatingPoint { get; init; }
    public int? BitRateKbps { get; init; }
}
