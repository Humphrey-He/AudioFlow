using AudioFlow.Audio.Buffering;
using Xunit;

namespace AudioFlow.Audio.Tests;

public sealed class AudioRingBufferTests
{
    [Theory]
    [InlineData(0)]
    [InlineData(100)]
    [InlineData(333)]
    public void Constructor_NonPowerOfTwo_ThrowsArgumentException(int capacity)
    {
        Assert.Throws<ArgumentException>(() => new AudioRingBuffer(capacity));
    }

    [Fact]
    public void Constructor_NegativeCapacity_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() => new AudioRingBuffer(-1));
    }

    [Fact]
    public void Write_EmptyInput_ReturnsZero()
    {
        var buffer = new AudioRingBuffer(256);
        var input = Array.Empty<float>();

        var written = buffer.Write(input);

        Assert.Equal(0, written);
    }

    [Fact]
    public void Read_EmptyBuffer_ReturnsZero()
    {
        var buffer = new AudioRingBuffer(256);
        var output = new float[100];

        var read = buffer.Read(output);

        Assert.Equal(0, read);
    }

    [Fact]
    public void AvailableToWrite_ReflectsActualCapacity()
    {
        var buffer = new AudioRingBuffer(256);

        Assert.Equal(256, buffer.AvailableToWrite);
        Assert.Equal(0, buffer.AvailableToRead);
    }

    [Fact]
    public void Clear_ResetsAllState()
    {
        var buffer = new AudioRingBuffer(256);
        buffer.Write(new float[128]);
        buffer.Clear();

        Assert.Equal(256, buffer.AvailableToWrite);
        Assert.Equal(0, buffer.AvailableToRead);
    }

    [Fact]
    public void Write_ExceedCapacity_DropsSamples()
    {
        var buffer = new AudioRingBuffer(64);
        var input = new float[128];

        var written = buffer.Write(input);

        Assert.Equal(64, written);
        Assert.Equal(64, buffer.AvailableToRead);
        Assert.Equal(0, buffer.AvailableToWrite);
    }

    [Fact]
    public void Read_UnderAvailable_ReturnsActualAmount()
    {
        var buffer = new AudioRingBuffer(256);
        buffer.Write(new float[100]);

        var output = new float[50];
        var read = buffer.Read(output);

        Assert.Equal(50, read);
        Assert.Equal(50, buffer.AvailableToRead);
    }

    [Fact]
    public void WriteAndRead_RoundTrip_PreservesData()
    {
        var buffer = new AudioRingBuffer(256);
        var input = new float[] { 1f, 2f, 3f, 4f, 5f };

        buffer.Write(input);

        var output = new float[5];
        buffer.Read(output);

        Assert.Equal(input, output);
    }
}