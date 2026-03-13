namespace AudioFlow.Visualization.Core;

public sealed class VisualizerHost
{
    private readonly List<IVisualizer> _visualizers = new();

    public IReadOnlyList<IVisualizer> Visualizers => _visualizers;

    public void Add(IVisualizer visualizer)
    {
        visualizer.Initialize();
        _visualizers.Add(visualizer);
    }

    public void Remove(IVisualizer visualizer)
    {
        if (_visualizers.Remove(visualizer))
        {
            visualizer.Dispose();
        }
    }

    public void RenderAll(SkiaSharp.SKCanvas canvas, SpectrumFrame frame, VisualizerRenderContext context)
    {
        foreach (var visualizer in _visualizers.ToArray())
        {
            if (!visualizer.IsEnabled)
            {
                continue;
            }

            try
            {
                visualizer.Render(canvas, frame, context);
            }
            catch
            {
                visualizer.IsEnabled = false;
            }
        }
    }
}
