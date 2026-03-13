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

    public void RenderPictureInPicture(SkiaSharp.SKCanvas canvas, SpectrumFrame frame, VisualizerRenderContext context,
        PictureInPictureLayout layout)
    {
        if (_visualizers.Count == 0)
        {
            return;
        }

        var (mainRect, insetRect) = layout.Split(context.Bounds);
        var primary = _visualizers[0];
        if (primary.IsEnabled)
        {
            var mainContext = new VisualizerRenderContext(mainRect);
            primary.Render(canvas, frame, mainContext);
        }

        if (_visualizers.Count < 2)
        {
            return;
        }

        var inset = _visualizers[1];
        if (!inset.IsEnabled)
        {
            return;
        }

        canvas.Save();
        canvas.ClipRect(insetRect);
        var insetContext = new VisualizerRenderContext(insetRect);
        inset.Render(canvas, frame, insetContext);
        canvas.Restore();
    }
}
