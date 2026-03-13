using SkiaSharp;

namespace AudioFlow.Visualization.Core;

public sealed class RenderEngine : IDisposable
{
    private SKSurface? _front;
    private SKSurface? _back;
    private SKImageInfo _info;
    private float _lastScale = 1f;

    public RenderEngine(RenderEngineSettings? settings = null)
    {
        Settings = settings ?? new RenderEngineSettings();
    }

    public RenderEngineSettings Settings { get; }

    public SKCanvas BeginFrame(int width, int height, float scale)
    {
        if (width <= 0 || height <= 0)
        {
            throw new ArgumentOutOfRangeException("Render size must be positive.");
        }

        _lastScale = Settings.EnableDpiScaling ? Math.Max(1f, scale) : 1f;
        var pixelWidth = Math.Max(1, (int)MathF.Round(width * _lastScale));
        var pixelHeight = Math.Max(1, (int)MathF.Round(height * _lastScale));

        if (_front == null || _back == null || _info.Width != pixelWidth || _info.Height != pixelHeight)
        {
            _info = new SKImageInfo(pixelWidth, pixelHeight, SKColorType.Bgra8888, SKAlphaType.Premul);
            _front?.Dispose();
            _back?.Dispose();
            _front = SKSurface.Create(_info);
            _back = SKSurface.Create(_info);
        }

        return _back!.Canvas;
    }

    public RenderFrame EndFrame()
    {
        if (_front == null || _back == null)
        {
            throw new InvalidOperationException("RenderEngine not initialized.");
        }

        (_front, _back) = (_back, _front);
        var image = _front.Snapshot();
        return new RenderFrame(image, _lastScale);
    }

    public void Dispose()
    {
        _front?.Dispose();
        _back?.Dispose();
    }
}
