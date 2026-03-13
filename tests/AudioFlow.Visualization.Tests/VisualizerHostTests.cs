using AudioFlow.Visualization.BuiltIn;
using AudioFlow.Visualization.Core;
using SkiaSharp;
using Xunit;

namespace AudioFlow.Visualization.Tests;

public sealed class VisualizerHostTests
{
    [Fact]
    public void RenderPictureInPicture_UsesPrimaryAndInset()
    {
        var host = new VisualizerHost();
        host.Add(new BarVisualizer());
        host.Add(new BarVisualizer());

        using var surface = SKSurface.Create(new SKImageInfo(200, 120));
        var frame = new SpectrumFrame(new float[8], new float[8], 48000, DateTime.UtcNow);
        var context = new VisualizerRenderContext(new SKRect(0, 0, 200, 120));

        host.RenderPictureInPicture(surface.Canvas, frame, context, new PictureInPictureLayout());

        Assert.Equal(2, host.Visualizers.Count);
    }
}
