using SkiaSharp;

namespace AudioFlow.Visualization.Core;

public readonly struct RenderFrame : IDisposable
{
    public RenderFrame(SKImage image, float scale)
    {
        Image = image;
        Scale = scale;
    }

    public SKImage Image { get; }
    public float Scale { get; }

    public void Dispose()
    {
        Image.Dispose();
    }
}
