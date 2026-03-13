using SkiaSharp;

namespace AudioFlow.Visualization.Core;

public sealed class VisualizerRenderContext
{
    public VisualizerRenderContext(SKRect bounds)
    {
        Bounds = bounds;
    }

    public SKRect Bounds { get; }
}
