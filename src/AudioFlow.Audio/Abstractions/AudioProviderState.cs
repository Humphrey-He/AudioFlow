namespace AudioFlow.Audio.Abstractions;

/// <summary>
/// Audio provider state.
/// </summary>
public enum AudioProviderState
{
    Uninitialized = 0,
    Running = 1,
    Paused = 2,
    Stopped = 3,
    Error = 4
}
