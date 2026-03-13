using AudioFlow.Audio.Abstractions;

namespace AudioFlow.Audio.Buffering;

public sealed class AudioBufferPipeline : IDisposable
{
    private readonly IAudioProvider _provider;
    private readonly AudioBuffer _buffer;

    public AudioBufferPipeline(IAudioProvider provider, int bufferCapacity)
    {
        _provider = provider ?? throw new ArgumentNullException(nameof(provider));
        _buffer = new AudioBuffer(bufferCapacity);

        _provider.DataAvailable += OnDataAvailable;
        _provider.StateChanged += OnStateChanged;
        _provider.ErrorOccurred += OnError;
    }

    public AudioBuffer Buffer => _buffer;

    public AudioProviderState State { get; private set; } = AudioProviderState.Uninitialized;

    public AudioProviderException? LastError { get; private set; }

    public event Action<AudioProviderState>? StateChanged;

    public void Start()
    {
        _provider.Start();
    }

    public void Stop()
    {
        _provider.Stop();
    }

    public int Read(Span<float> destination)
    {
        return _buffer.Read(destination);
    }

    public void Dispose()
    {
        _provider.DataAvailable -= OnDataAvailable;
        _provider.StateChanged -= OnStateChanged;
        _provider.ErrorOccurred -= OnError;
        _provider.Dispose();
    }

    private void OnDataAvailable(ReadOnlySpan<float> data)
    {
        _buffer.Write(data);
    }

    private void OnStateChanged(AudioProviderState state)
    {
        State = state;
        StateChanged?.Invoke(state);
    }

    private void OnError(AudioProviderException exception)
    {
        LastError = exception;
    }
}
