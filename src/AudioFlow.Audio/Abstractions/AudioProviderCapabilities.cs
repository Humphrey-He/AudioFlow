namespace AudioFlow.Audio.Abstractions;

/// <summary>
/// Audio provider capabilities.
/// </summary>
[Flags]
public enum AudioProviderCapabilities
{
    None = 0,
    Capture = 1 << 0,
    Playback = 1 << 1,
    Seek = 1 << 2,
    Pause = 1 << 3,
    DeviceSelection = 1 << 4,
    Metadata = 1 << 5
}
