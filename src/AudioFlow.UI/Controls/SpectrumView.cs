using System.Diagnostics;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Media;
using Avalonia.Platform;
using Avalonia.Rendering;
using Avalonia.Threading;
using AudioFlow.Audio.Buffering;
using AudioFlow.Audio.Providers;
using AudioFlow.Dsp.Analysis;
using AudioFlow.Dsp.Processing;
using AudioFlow.Dsp.Smoothing;
using AudioFlow.Dsp.Weighting;
using AudioFlow.Dsp.Windowing;
using AudioFlow.Visualization.BuiltIn;
using AudioFlow.Visualization.Core;
using SkiaSharp;

namespace AudioFlow.UI.Controls;

public sealed class SpectrumView : Control
{
    private const int FftSize = 1024;
    private readonly float[] _sampleBuffer = new float[FftSize];
    private readonly Stopwatch _stopwatch = Stopwatch.StartNew();
    private readonly SpectrumAnalyzer _analyzer = new(new SpectrumAnalyzerOptions
    {
        FftSize = FftSize,
        ZeroPaddingFactor = 1,
        WindowFunction = WindowFunctionType.Hann,
        IncludePhase = true
    });

    private readonly SpectrumProcessor _processor;
    private readonly RenderEngine _renderEngine = new(new RenderEngineSettings { TargetFps = 60 });
    private readonly VisualizerHost _visualizerHost = new();
    private readonly PictureInPictureLayout _pipLayout = new();

    private AudioBufferPipeline? _pipeline;
    private DispatcherTimer? _timer;
    private SpectrumFrame _frame = new(Array.Empty<float>(), Array.Empty<float>(), 48000, DateTime.UtcNow);

    public SpectrumView()
    {
        _processor = new SpectrumProcessor(
            _analyzer,
            FrequencyWeightingType.A,
            new SmoothingSettings { Type = SmoothingType.Gravity, Attack = 0.6f, Decay = 0.2f },
            logScale: true);

        var primary = new BarVisualizer();
        var inset = new BarVisualizer();
        inset.SetParameter("AmplitudeScale", 80f);
        inset.SetParameter("Color", new SKColor(255, 99, 132));

        _visualizerHost.Add(primary);
        _visualizerHost.Add(inset);

        AttachedToVisualTree += OnAttachedToVisualTree;
        DetachedFromVisualTree += OnDetachedFromVisualTree;
    }

    public override void Render(DrawingContext context)
    {
        var bounds = Bounds;
        context.Custom(new SpectrumDrawOp(bounds, _visualizerHost, _renderEngine, _pipLayout, _frame, _stopwatch.Elapsed, this));
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
        var interval = TimeSpan.FromMilliseconds(1000.0 / _renderEngine.Settings.TargetFps);
        _timer = new DispatcherTimer(interval, DispatcherPriority.Render, (_, _) =>
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

        var result = _processor.Process(_sampleBuffer, _pipeline.SampleRate);
        _frame = new SpectrumFrame(result.Magnitudes, result.Phases, result.SampleRate, result.TimestampUtc);
    }

    private sealed class SpectrumDrawOp : ICustomDrawOperation
    {
        private readonly Rect _bounds;
        private readonly VisualizerHost _host;
        private readonly RenderEngine _renderEngine;
        private readonly PictureInPictureLayout _pipLayout;
        private readonly SpectrumFrame _frame;
        private readonly TimeSpan _elapsed;
        private readonly Visual _visual;

        public SpectrumDrawOp(Rect bounds, VisualizerHost host, RenderEngine renderEngine, PictureInPictureLayout pipLayout,
            SpectrumFrame frame, TimeSpan elapsed, Visual visual)
        {
            _bounds = bounds;
            _host = host;
            _renderEngine = renderEngine;
            _pipLayout = pipLayout;
            _frame = frame;
            _elapsed = elapsed;
            _visual = visual;
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

            var width = Math.Max(1, (int)_bounds.Width);
            var height = Math.Max(1, (int)_bounds.Height);
            var scale = (float)(_visual.VisualRoot?.RenderScaling ?? 1.0);

            var frameCanvas = _renderEngine.BeginFrame(width, height, scale);
            frameCanvas.Clear(_renderEngine.Settings.BackgroundColor);

            var renderContext = new VisualizerRenderContext(new SKRect(0, 0, width * scale, height * scale));
            if (_host.Visualizers.Count > 1)
            {
                _host.RenderPictureInPicture(frameCanvas, _frame, renderContext, _pipLayout);
            }
            else
            {
                _host.RenderAll(frameCanvas, _frame, renderContext);
            }

            using var frame = _renderEngine.EndFrame();
            var dest = new SKRect(0, 0, width, height);
            canvas.DrawImage(frame.Image, dest);

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
