using SkiaSharp;

namespace AudioFlow.Visualization.Core;

public sealed class RenderEngine : IDisposable
{
    private SKSurface? _front;
    private SKSurface? _back;
    private SKImageInfo _info;

    public SKCanvas BeginFrame(int width, int height)
    {
        if (_front == null || _back == null || _info.Width != width || _info.Height != height)
        {
            _info = new SKImageInfo(width, height, SKColorType.Bgra8888, SKAlphaType.Premul);
            _front?.Dispose();
            _back?.Dispose();
            _front = SKSurface.Create(_info);
            _back = SKSurface.Create(_info);
        }

        return _back!.Canvas;
    }

    public SKImage EndFrame()
    {
        if (_front == null || _back == null)
        {
            throw new InvalidOperationException("RenderEngine not initialized.");
        }

        (_front, _back) = (_back, _front);
        return _front.Snapshot();
    }

    public void Dispose()
    {
        _front?.Dispose();
        _back?.Dispose();
    }
}
