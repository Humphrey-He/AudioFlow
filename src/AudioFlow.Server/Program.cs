using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using AudioFlow.Audio.Buffering;
using AudioFlow.Audio.Providers;
using AudioFlow.Dsp.Analysis;
using AudioFlow.Dsp.Processing;
using AudioFlow.Dsp.Smoothing;
using AudioFlow.Dsp.Weighting;
using AudioFlow.Dsp.Windowing;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.UseWebSockets();
app.UseStaticFiles();

app.MapGet("/", () => Results.Redirect("/index.html"));

app.MapGet("/ws", async (HttpContext context) =>
{
    if (!context.WebSockets.IsWebSocketRequest)
    {
        context.Response.StatusCode = 400;
        return;
    }

    using var webSocket = await context.WebSockets.AcceptWebSocketAsync();

    // Initialize audio pipeline
    var factory = new AudioProviderFactory();
    var provider = factory.CreateSystemCaptureProvider();
    using var pipeline = new AudioBufferPipeline(provider, bufferCapacity: 4096);

    var analyzer = new SpectrumAnalyzer(new SpectrumAnalyzerOptions
    {
        FftSize = 1024,
        ZeroPaddingFactor = 1,
        WindowFunction = WindowFunctionType.Hann,
        IncludePhase = false
    });

    var processor = new SpectrumProcessor(
        analyzer,
        FrequencyWeightingType.A,
        new SmoothingSettings { Type = SmoothingType.Gravity, Attack = 0.6f, Decay = 0.2f },
        logScale: true);

    var buffer = new float[1024];
    var magnitudes = new float[512];
    var frameCount = 0;

    pipeline.Start();

    var sendTask = Task.Run(async () =>
    {
        while (webSocket.State == WebSocketState.Open)
        {
            var read = pipeline.Read(buffer);
            if (read < 1024)
            {
                await Task.Delay(5);
                continue;
            }

            var result = processor.Process(buffer, 48000);

            // Downsample to ~60 bins for visualization
            Array.Copy(result.Magnitudes, magnitudes, 512);

            var data = new
            {
                frame = frameCount++,
                timestamp = DateTime.UtcNow.ToString("O"),
                magnitudes = magnitudes.Select(m => Math.Round(m, 1)).ToArray()
            };

            var json = JsonSerializer.Serialize(data);
            var bytes = Encoding.UTF8.GetBytes(json);
            await webSocket.SendAsync(bytes, WebSocketMessageType.Text, true, CancellationToken.None);

            await Task.Delay(50); // ~20 fps
        }
    });

    try
    {
        await sendTask;
    }
    catch (WebSocketException)
    {
        // Client disconnected
    }
    finally
    {
        pipeline.Stop();
    }
});

app.Run();