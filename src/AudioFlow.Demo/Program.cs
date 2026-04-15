using AudioFlow.Audio.Buffering;
using AudioFlow.Audio.Providers;
using AudioFlow.Dsp.Analysis;
using AudioFlow.Dsp.Processing;
using AudioFlow.Dsp.Smoothing;
using AudioFlow.Dsp.Weighting;
using AudioFlow.Dsp.Windowing;

const int fftSize = 1024;
const int bufferCapacity = 2048;
const int displayWidth = 60;
const int displayHeight = 15;

if (args.Length == 0)
{
    Console.WriteLine("Usage: AudioFlow.Demo <audio-file-path>|--system");
    return;
}

var factory = new AudioProviderFactory();
var provider = args[0].Equals("--system", StringComparison.OrdinalIgnoreCase)
    ? factory.CreateSystemCaptureProvider()
    : new FileAudioProvider(args[0]);

using var pipeline = new AudioBufferPipeline(provider, bufferCapacity);
var analyzer = new SpectrumAnalyzer(new SpectrumAnalyzerOptions
{
    FftSize = fftSize,
    ZeroPaddingFactor = 1,
    WindowFunction = WindowFunctionType.Hann,
    IncludePhase = false
});

var processor = new SpectrumProcessor(
    analyzer,
    FrequencyWeightingType.A,
    new SmoothingSettings { Type = SmoothingType.Gravity, Attack = 0.6f, Decay = 0.2f },
    logScale: true);

pipeline.Start();
Console.WriteLine("═══════════════════════════════════════════════════════════════");
Console.WriteLine("              AudioFlow Spectrum Visualization");
Console.WriteLine("═══════════════════════════════════════════════════════════════");
Console.WriteLine($"FFT Size: {fftSize} | Display: {displayWidth}x{displayHeight} | dB Range: -60 to 0");
Console.WriteLine("═══════════════════════════════════════════════════════════════");
Console.WriteLine();

var buffer = new float[fftSize];
var cancel = false;
Console.CancelKeyPress += (_, e) =>
{
    e.Cancel = true;
    cancel = true;
};

// Print a few sample frames to show it's working
var frameCount = 0;
while (!cancel && frameCount < 5)
{
    var read = pipeline.Read(buffer);
    if (read < fftSize)
    {
        Thread.Sleep(5);
        continue;
    }

    var result = processor.Process(buffer, 48000);
    var magnitudes = result.Magnitudes;
    var bins = magnitudes.Length;

    // Build ASCII spectrum
    Console.WriteLine($"Frame {frameCount + 1} @ {DateTime.Now:HH:mm:ss.fff}");
    Console.WriteLine("─".PadRight(displayWidth + 20, '─'));

    for (var row = displayHeight - 1; row >= 0; row--)
    {
        var line = new char[displayWidth];
        var dbMax = -60 + row * 4; // dB at this row

        for (var col = 0; col < displayWidth; col++)
        {
            var binIndex = (int)Math.Pow(bins - 1, col / (double)(displayWidth - 1));
            binIndex = Math.Clamp(binIndex, 0, bins - 1);
            var mag = magnitudes[binIndex];
            line[col] = mag >= dbMax ? '█' : ' ';
        }

        var label = row == displayHeight - 1 ? "  0 dB" : row == displayHeight / 2 ? "-30 dB" : "";
        Console.WriteLine(new string(line) + label);
    }
    Console.WriteLine();

    frameCount++;
    Thread.Sleep(500); // Show 2 frames per second for demo
}

Console.WriteLine("─────────────────────────────────────────────────────────────");
Console.WriteLine("Spectrum visualization captured 5 frames.");
Console.WriteLine("Run `dotnet run -- --system` to see real-time visualization.");
pipeline.Stop();