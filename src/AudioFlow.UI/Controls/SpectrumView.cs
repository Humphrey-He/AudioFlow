using System.Diagnostics;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Media;
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
    private float[] _magnitudes = Array.Empty<float>();
    private float[] _phases = Array.Empty<float>();
    private SpectrumFrame _frame = new(Array.Empty<float>(), Array.Empty<float>(), 48000, DateTime.UtcNow);
    private Image? _image;

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

        _image = new Image();

        AttachedToVisualTree += OnAttachedToVisualTree;
        DetachedFromVisualTree += OnDetachedFromVisualTree;
    }

    static SpectrumView()
    {
        AffectsRender<SpectrumView>(BoundsProperty);
    }

    public override void Render(DrawingContext context)
    {
        // Draw black background
        context.FillRectangle(Brushes.Black, new Rect(0, 0, Bounds.Width, Bounds.Height));

        // Render visualization
        var width = Math.Max(1, (int)Bounds.Width);
        var height = Math.Max(1, (int)Bounds.Height);

        if (width > 0 && height > 0)
        {
            using var bitmap = new SKBitmap(width, height, SKColorType.Bgra8888, SKAlphaType.Premul);
            using var surface = SKSurface.Create(bitmap.Info, bitmap.GetPixels());
            if (surface != null)
            {
                var canvas = surface.Canvas;
                canvas.Clear(SKColor.Parse("#08080A"));

                var renderContext = new VisualizerRenderContext(new SKRect(0, 0, width, height));
                if (_visualizerHost.Visualizers.Count > 1)
                {
                    _visualizerHost.RenderPictureInPicture(canvas, _frame, renderContext, _pipLayout);
                }
                else
                {
                    _visualizerHost.RenderAll(canvas, _frame, renderContext);
                }

                // Draw time overlay
                using var textPaint = new SKPaint
                {
                    Color = SKColors.White,
                    TextSize = 14f,
                    IsAntialias = true
                };
                canvas.DrawText($"AudioFlow · {_stopwatch.Elapsed:mm\\:ss}", 12f, 22f, textPaint);

                // Convert to Avalonia bitmap and draw
                using var pixmap = bitmap.PeekPixels();
                if (pixmap != null)
                {
                    using var imageData = pixmap.Encode(SKEncodedImageFormat.Png, 100);
                    using var stream = new System.IO.MemoryStream();
                    imageData.SaveTo(stream);
                    stream.Position = 0;

                    var avaloniaBitmap = new Avalonia.Media.Imaging.Bitmap(stream);
                    context.DrawImage(avaloniaBitmap, new Rect(0, 0, width, height));
                }
            }
        }
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
        if (_magnitudes.Length != result.Magnitudes.Length)
        {
            _magnitudes = new float[result.Magnitudes.Length];
        }

        if (_phases.Length != result.Phases.Length)
        {
            _phases = new float[result.Phases.Length];
        }

        Array.Copy(result.Magnitudes, _magnitudes, result.Magnitudes.Length);
        Array.Copy(result.Phases, _phases, result.Phases.Length);
        _frame = new SpectrumFrame(_magnitudes, _phases, result.SampleRate, result.TimestampUtc);
    }
}