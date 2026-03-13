namespace AudioFlow.Audio.Abstractions;

/// <summary>
/// Audio metadata for local files.
/// </summary>
public sealed class AudioMetadata
{
    public string? Title { get; init; }
    public string? Artist { get; init; }
    public string? Album { get; init; }
    public uint? TrackNumber { get; init; }
    public TimeSpan? Duration { get; init; }
    public int? BitRateKbps { get; init; }
    public int? SampleRate { get; init; }
    public int? BitDepth { get; init; }
    public string? Format { get; init; }
    public long? FileSizeBytes { get; init; }
    public DateTime? LastModifiedUtc { get; init; }
}
