using AudioFlow.Audio.Buffering;
using AudioFlow.Audio.Providers;
using AudioFlow.Dsp.Analysis;
using AudioFlow.Dsp.Processing;
using AudioFlow.Dsp.Scaling;
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
Console.WriteLine($"AudioFlow Spectrum Visualization");
Console.WriteLine($"FFT Size: {fftSize} | Display: {displayWidth}x{displayHeight}");
Console.WriteLine($"Press Ctrl+C to stop.");
Console.WriteLine();

var buffer = new float[fftSize];
float[] previousMags = Array.Empty<float>();
var cancel = false;
Console.CancelKeyPress += (_, e) =>
{
    e.Cancel = true;
    cancel = true;
};

// Move cursor to beginning and hide cursor
Console.Write("\x1b[?25l");

while (!cancel)
{
    var read = pipeline.Read(buffer);
    if (read < fftSize)
    {
        Thread.Sleep(5);
        continue;
    }

    var result = processor.Process(buffer, 48000);
    var magnitudes = result.Magnitudes;

    // Normalize to display height (0-15 dB range mapped to 0-height)
    var bins = magnitudes.Length;
    var displayBars = new char[displayWidth];

    for (var i = 0; i < displayWidth; i++)
    {
        // Map display column to frequency bin (log scale for better visual)
        var binIndex = (int)Math.Pow(bins - 1, i / (double)(displayWidth - 1));
        binIndex = Math.Clamp(binIndex, 0, bins - 1);

        var mag = magnitudes[binIndex];
        // Map dB (-180 to 0) to height (0 to displayHeight-1)
        var normalized = (mag + 60) / 60.0; // -60 dB to 0 dB range
        normalized = Math.Clamp(normalized, 0, 1);
        var height = (int)(normalized * (displayHeight - 1));
        displayBars[i] = (char)('\u2581' + (7 - Math.Min(7, displayHeight - 1 - height)));
    }

    // Build display
    var lines = new string[displayHeight];
    for (var row = displayHeight - 1; row >= 0; row--)
    {
        var line = new char[displayWidth + 20];
        for (var col = 0; col < displayWidth; col++)
        {
            var h = displayHeight - 1 - row;
            // Find if this row should have a bar character
            var binIndex = (int)Math.Pow(bins - 1, col / (double)(displayWidth - 1));
            binIndex = Math.Clamp(binIndex, 0, bins - 1);
            var mag = magnitudes[binIndex];
            var normalized = (mag + 60) / 60.0;
            normalized = Math.Clamp(normalized, 0, 1);
            var barHeight = (int)(normalized * (displayHeight - 1));

            line[col] = barHeight >= h ? displayBars[col] : ' ';
        }
        // Add dB label
        var dbLabel = row == displayHeight - 1 ? "  0 dB" : row == displayHeight / 2 ? "-30 dB" : "";
        Array.Copy(dbLabel.ToCharArray(), 0, line, displayWidth, dbLabel.Length);
        lines[row] = new string(line).TrimEnd();
    }

    // Move cursor to beginning and redraw
    Console.Write("\x1b[0G\x1b[2K"); // Go to column 0 and clear line
    foreach (var line in lines)
    {
        Console.Write(line + "\x1b[1G\x1b[1B"); // Go to column 0 and down
    }
    Console.Write($"\x1b[{displayHeight}A"); // Move back up

    // Small delay to control frame rate
    Thread.Sleep(50);
}

// Cleanup
Console.Write("\x1b[?25h"); // Show cursor
Console.WriteLine("\nStopped.");
pipeline.Stop();