namespace AudioFlow.Audio.Buffering;

public readonly struct AudioBufferStats
{
    public AudioBufferStats(long totalWritten, long totalRead, long droppedSamples)
    {
        TotalWritten = totalWritten;
        TotalRead = totalRead;
        DroppedSamples = droppedSamples;
    }

    public long TotalWritten { get; }
    public long TotalRead { get; }
    public long DroppedSamples { get; }
}
