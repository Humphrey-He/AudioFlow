using System.Diagnostics.CodeAnalysis;

namespace AudioFlow.Audio.Abstractions;

public interface IAudioProvider : IDisposable
{
    event Action<ReadOnlySpan<float>>? DataAvailable;
    event Action<AudioProviderState>? StateChanged;
    event Action<AudioProviderException>? ErrorOccurred;

    int SampleRate { get; }
    int Channels { get; }
    bool IsRunning { get; }
    TimeSpan CurrentTime { get; }
    TimeSpan? Duration { get; }
    string SourceName { get; }
    AudioProviderCapabilities Capabilities { get; }

    void Start();
    void Stop();
    void Pause();
    void Resume();

    bool TrySeek(TimeSpan position);

    [SuppressMessage("Design", "CA1024:Use properties where appropriate")]
    AudioFormat GetAudioFormat();
}
