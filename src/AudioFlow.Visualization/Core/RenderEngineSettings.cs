using SkiaSharp;

namespace AudioFlow.Visualization.Core;

public sealed class RenderEngineSettings
{
    public int TargetFps { get; init; } = 60;
    public bool EnableDpiScaling { get; init; } = true;
    public SKColor BackgroundColor { get; init; } = new(8, 8, 10);
}
