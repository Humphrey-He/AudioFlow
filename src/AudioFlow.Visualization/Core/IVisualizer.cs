using SkiaSharp;

namespace AudioFlow.Visualization.Core;

public interface IVisualizer : IDisposable
{
    string Name { get; }
    Version Version { get; }
    bool IsEnabled { get; set; }

    void Initialize();
    void Render(SKCanvas canvas, SpectrumFrame frame, VisualizerRenderContext context);
    void SetParameter(string key, object value);
}
