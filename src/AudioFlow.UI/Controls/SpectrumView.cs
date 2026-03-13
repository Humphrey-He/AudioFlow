using System.Diagnostics;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Media;
using Avalonia.Platform;
using Avalonia.Rendering;
using Avalonia.Threading;
using AudioFlow.Audio.Buffering;
using AudioFlow.Audio.Providers;
using AudioFlow.Dsp.Processing;
using AudioFlow.Dsp.Windowing;
using SkiaSharp;

namespace AudioFlow.UI.Controls;

public sealed class SpectrumView : Control
{
    private const int FftSize = 1024;
    private readonly float[] _sampleBuffer = new float[FftSize];
    private readonly SpectrumAnalyzer _analyzer = new();
    private readonly float[] _magnitudes = new float[FftSize / 2];
    private readonly Stopwatch _stopwatch = Stopwatch.StartNew();
    private AudioBufferPipeline? _pipeline;
    private DispatcherTimer? _timer;

    public SpectrumView()
    {
        AttachedToVisualTree += OnAttachedToVisualTree;
        DetachedFromVisualTree += OnDetachedFromVisualTree;
    }

    public override void Render(DrawingContext context)
    {
        var bounds = Bounds;
        context.Custom(new SpectrumDrawOp(bounds, _magnitudes, _stopwatch.Elapsed));
    }

    private void OnAttachedToVisualTree(object? sender, VisualTreeAttachmentEventArgs e)
    {
        StartAudioPipeline();
        StartRenderLoop();
    }

    private void OnDetachedFromVisualTree(object? sender, VisualTreeAttachmentEventArgs e)
    {
        StopRenderLoop();
        StopAudioPipeline();
    }

    private void StartAudioPipeline()
    {
        var factory = new AudioProviderFactory();
        var provider = factory.CreateSystemCaptureProvider();
        _pipeline = new AudioBufferPipeline(provider, 2048);
        _pipeline.Start();
    }

    private void StopAudioPipeline()
    {
        _pipeline?.Stop();
        _pipeline?.Dispose();
        _pipeline = null;
    }

    private void StartRenderLoop()
    {
        _timer = new DispatcherTimer(TimeSpan.FromMilliseconds(1000.0 / 60.0), DispatcherPriority.Render, (_, _) =>
        {
            UpdateSpectrum();
            InvalidateVisual();
        });
        _timer.Start();
    }

    private void StopRenderLoop()
    {
        _timer?.Stop();
        _timer = null;
    }

    private void UpdateSpectrum()
    {
        if (_pipeline == null)
        {
            return;
        }

        var read = _pipeline.Read(_sampleBuffer);
        if (read < FftSize)
        {
            return;
        }

        var magnitudes = _analyzer.Analyze(_sampleBuffer, WindowFunctionType.Hann);
        var length = Math.Min(magnitudes.Length, _magnitudes.Length);
        Array.Copy(magnitudes, _magnitudes, length);
    }

    private sealed class SpectrumDrawOp : ICustomDrawOperation
    {
        private readonly Rect _bounds;
        private readonly float[] _magnitudes;
        private readonly TimeSpan _elapsed;

        public SpectrumDrawOp(Rect bounds, float[] magnitudes, TimeSpan elapsed)
        {
            _bounds = bounds;
            _magnitudes = magnitudes;
            _elapsed = elapsed;
        }

        public Rect Bounds => _bounds;

        public void Dispose()
        {
        }

        public bool HitTest(Point p) => false;

        public bool Equals(ICustomDrawOperation? other) => false;

        public void Render(ImmediateDrawingContext context)
        {
            var leaseFeature = context.TryGetFeature<ISkiaSharpApiLeaseFeature>();
            if (leaseFeature == null)
            {
                return;
            }

            using var lease = leaseFeature.Lease();
            var canvas = lease.SkCanvas;

            canvas.Clear(new SKColor(8, 8, 10));

            if (_magnitudes.Length == 0)
            {
                return;
            }

            var barCount = _magnitudes.Length;
            var barWidth = (float)(_bounds.Width / barCount);
            var maxHeight = (float)(_bounds.Height * 0.9);

            using var barPaint = new SKPaint
            {
                Color = new SKColor(56, 217, 169),
                IsAntialias = true
            };

            for (var i = 0; i < barCount; i++)
            {
                var magnitude = _magnitudes[i];
                var normalized = Math.Clamp(magnitude / 50f, 0f, 1f);
                var barHeight = normalized * maxHeight;
                var x = i * barWidth;
                var y = (float)_bounds.Height - barHeight;
                var width = MathF.Max(1f, barWidth - 1f);
                canvas.DrawRect(x, y, width, barHeight, barPaint);
            }

            using var textPaint = new SKPaint
            {
                Color = SKColors.White,
                TextSize = 14f,
                IsAntialias = true
            };

            canvas.DrawText($"AudioFlow Spectrum · {_elapsed:mm\\:ss}", 12f, 22f, textPaint);
        }
    }
}
