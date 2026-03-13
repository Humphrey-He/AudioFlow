namespace AudioFlow.Audio.Buffering;

public sealed class AudioBuffer
{
    private readonly AudioRingBuffer _ring;
    private long _totalWritten;
    private long _totalRead;
    private long _droppedSamples;

    public AudioBuffer(int capacity)
    {
        if (capacity < 128 || capacity > 4096)
        {
            throw new ArgumentOutOfRangeException(nameof(capacity), "Capacity must be between 128 and 4096 samples.");
        }

        _ring = new AudioRingBuffer(capacity);
    }

    public int Capacity => _ring.Capacity;

    public int AvailableToRead => _ring.AvailableToRead;

    public int AvailableToWrite => _ring.AvailableToWrite;

    public int Write(ReadOnlySpan<float> data)
    {
        var written = _ring.Write(data);
        _totalWritten += written;

        var dropped = data.Length - written;
        if (dropped > 0)
        {
            _droppedSamples += dropped;
        }

        return written;
    }

    public int Read(Span<float> destination)
    {
        var read = _ring.Read(destination);
        _totalRead += read;
        return read;
    }

    public void Clear()
    {
        _ring.Clear();
    }

    public AudioBufferStats GetStats()
    {
        return new AudioBufferStats(_totalWritten, _totalRead, _droppedSamples);
    }
}
