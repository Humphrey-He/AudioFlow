using System.Text.Json;
using SkiaSharp;
using AudioFlow.Visualization.Core;

namespace AudioFlow.Visualization.BuiltIn;

public sealed class BarVisualizer : IVisualizer, IVisualizerParameterProvider
{
    public string Name => "Bars";
    public Version Version => new(1, 1, 0);
    public bool IsEnabled { get; set; } = true;

    private SKPaint? _paint;
    private float _amplitudeScale = 50f;

    public void Initialize()
    {
        _paint = new SKPaint
        {
            Color = new SKColor(56, 217, 169),
            IsAntialias = true
        };
    }

    public void Render(SKCanvas canvas, SpectrumFrame frame, VisualizerRenderContext context)
    {
        if (_paint == null || frame.Magnitudes.Length == 0)
        {
            return;
        }

        var bounds = context.Bounds;
        var barCount = frame.Magnitudes.Length;
        var barWidth = bounds.Width / barCount;
        var maxHeight = bounds.Height * 0.9f;

        for (var i = 0; i < barCount; i++)
        {
            var magnitude = frame.Magnitudes[i];
            var normalized = Math.Clamp(magnitude / _amplitudeScale, 0f, 1f);
            var barHeight = normalized * maxHeight;
            var x = bounds.Left + i * barWidth;
            var y = bounds.Bottom - barHeight;
            var width = MathF.Max(1f, barWidth - 1f);
            canvas.DrawRect(x, y, width, barHeight, _paint);
        }
    }

    public void SetParameter(string key, object value)
    {
        if (string.Equals(key, "Color", StringComparison.OrdinalIgnoreCase) && value is SKColor color && _paint != null)
        {
            _paint.Color = color;
        }
        else if (string.Equals(key, "AmplitudeScale", StringComparison.OrdinalIgnoreCase) && value is float scale)
        {
            _amplitudeScale = Math.Max(1f, scale);
        }
    }

    public bool TryGetParameters(out VisualizerParameterSet parameterSet)
    {
        var values = new Dictionary<string, JsonElement>
        {
            ["Color"] = JsonSerializer.SerializeToElement(_paint?.Color ?? new SKColor(56, 217, 169)),
            ["AmplitudeScale"] = JsonSerializer.SerializeToElement(_amplitudeScale)
        };

        parameterSet = new VisualizerParameterSet(Name, Version, values);
        return true;
    }

    public void ApplyParameters(VisualizerParameterSet parameterSet)
    {
        if (parameterSet.Values.TryGetValue("Color", out var colorElement))
        {
            var color = colorElement.Deserialize<SKColor>();
            if (color.HasValue && _paint != null)
            {
                _paint.Color = color.Value;
            }
        }

        if (parameterSet.Values.TryGetValue("AmplitudeScale", out var scaleElement))
        {
            var scale = scaleElement.GetSingle();
            _amplitudeScale = Math.Max(1f, scale);
        }
    }

    public void Dispose()
    {
        _paint?.Dispose();
    }
}
