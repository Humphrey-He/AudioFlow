namespace AudioFlow.Dsp.Analysis;

public sealed class SpectrumResult
{
    public SpectrumResult(float[] magnitudes, float[] phases, int sampleRate, DateTime timestampUtc)
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
