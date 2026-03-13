using AudioFlow.Audio.Buffering;
using Xunit;

namespace AudioFlow.Audio.Tests;

public sealed class AudioBufferTests
{
    [Fact]
    public void AudioBuffer_WriteRead_RoundTrips()
    {
        var buffer = new AudioBuffer(256);
        var input = new float[] { 1f, 2f, 3f, 4f };

        var written = buffer.Write(input);
        var output = new float[4];
        var read = buffer.Read(output);

        Assert.Equal(input.Length, written);
        Assert.Equal(input.Length, read);
        Assert.Equal(input, output);
    }

    [Fact]
    public void AudioBuffer_Drops_WhenFull()
    {
        var buffer = new AudioBuffer(128);
        var input = new float[256];

        var written = buffer.Write(input);

        Assert.True(written <= 128);
        Assert.True(buffer.GetStats().DroppedSamples > 0);
    }
}
