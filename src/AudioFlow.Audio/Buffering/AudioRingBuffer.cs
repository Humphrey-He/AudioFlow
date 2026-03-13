using System.Threading;

namespace AudioFlow.Audio.Buffering;

/// <summary>
/// Single-producer single-consumer ring buffer for floats.
/// </summary>
public sealed class AudioRingBuffer
{
    private readonly float[] _buffer;
    private readonly int _mask;
    private int _writeIndex;
    private int _readIndex;

    public AudioRingBuffer(int capacity)
    {
        if (capacity <= 0 || (capacity & (capacity - 1)) != 0)
        {
            throw new ArgumentException("Capacity must be a power of two.", nameof(capacity));
        }

        _buffer = new float[capacity];
        _mask = capacity - 1;
    }

    public int Capacity => _buffer.Length;

    public int AvailableToRead => Volatile.Read(ref _writeIndex) - Volatile.Read(ref _readIndex);

    public int AvailableToWrite => Capacity - AvailableToRead;

    public int Write(ReadOnlySpan<float> input)
    {
        var toWrite = Math.Min(input.Length, AvailableToWrite);
        if (toWrite <= 0)
        {
            return 0;
        }

        var writeIndex = Volatile.Read(ref _writeIndex);
        for (var i = 0; i < toWrite; i++)
        {
            _buffer[(writeIndex + i) & _mask] = input[i];
        }

        Volatile.Write(ref _writeIndex, writeIndex + toWrite);
        return toWrite;
    }

    public int Read(Span<float> output)
    {
        var toRead = Math.Min(output.Length, AvailableToRead);
        if (toRead <= 0)
        {
            return 0;
        }

        var readIndex = Volatile.Read(ref _readIndex);
        for (var i = 0; i < toRead; i++)
        {
            output[i] = _buffer[(readIndex + i) & _mask];
        }

        Volatile.Write(ref _readIndex, readIndex + toRead);
        return toRead;
    }

    public void Clear()
    {
        Volatile.Write(ref _readIndex, 0);
        Volatile.Write(ref _writeIndex, 0);
        Array.Clear(_buffer, 0, _buffer.Length);
    }
}
