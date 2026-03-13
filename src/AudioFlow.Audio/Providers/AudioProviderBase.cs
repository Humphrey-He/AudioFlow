using AudioFlow.Audio.Abstractions;

namespace AudioFlow.Audio.Providers;

public abstract class AudioProviderBase : IAudioProvider
{
    public event Action<ReadOnlySpan<float>>? DataAvailable;
    public event Action<AudioProviderState>? StateChanged;
    public event Action<AudioProviderException>? ErrorOccurred;

    public int SampleRate { get; protected set; }
    public int Channels { get; protected set; }
    public bool IsRunning => State == AudioProviderState.Running;
    public TimeSpan CurrentTime { get; protected set; }
    public TimeSpan? Duration { get; protected set; }
    public abstract string SourceName { get; }
    public abstract AudioProviderCapabilities Capabilities { get; }

    protected AudioProviderState State { get; set; } = AudioProviderState.Uninitialized;

    public abstract void Start();
    public abstract void Stop();
    public abstract void Pause();
    public abstract void Resume();
    public abstract bool TrySeek(TimeSpan position);
    public abstract AudioFormat GetAudioFormat();

    public virtual void Dispose()
    {
        Stop();
    }

    protected void RaiseDataAvailable(ReadOnlySpan<float> buffer)
    {
        DataAvailable?.Invoke(buffer);
    }

    protected void RaiseStateChanged(AudioProviderState state)
    {
        State = state;
        StateChanged?.Invoke(state);
    }

    protected void RaiseError(AudioProviderException exception)
    {
        State = AudioProviderState.Error;
        ErrorOccurred?.Invoke(exception);
    }
}
