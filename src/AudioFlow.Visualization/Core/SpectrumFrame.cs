namespace AudioFlow.Visualization.Core;

public sealed class SpectrumFrame
{
    public SpectrumFrame(float[] magnitudes, float[] phases, int sampleRate, DateTime timestampUtc)
    {
        Magnitudes = magnitudes;
        Phases = phases;
        SampleRate = sampleRate;
        TimestampUtc = timestampUtc;
    }

    public float[] Magnitudes { get; }
    public float[] Phases { get; }
    public int SampleRate { get; }
    public DateTime TimestampUtc { get; }
}
