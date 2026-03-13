using System.Diagnostics;
using System.Numerics;
using AudioFlow.Dsp.Analysis;
using AudioFlow.Dsp.Processing;
using AudioFlow.Dsp.Windowing;

var fftSizes = new[] { 512, 1024, 2048, 4096, 8192 };
var rand = new Random(42);

Console.WriteLine("AudioFlow FFT Benchmarks (ms per FFT)");
Console.WriteLine("-------------------------------------");

foreach (var fftSize in fftSizes)
{
    var input = new float[fftSize];
    for (var i = 0; i < input.Length; i++)
    {
        input[i] = (float)(rand.NextDouble() * 2 - 1);
    }

    var output = new Complex[fftSize];
    var warm = 100;
    for (var i = 0; i < warm; i++)
    {
        FftProcessor.Compute(input, output);
    }

    var iterations = 200;
    var sw = Stopwatch.StartNew();
    for (var i = 0; i < iterations; i++)
    {
        FftProcessor.Compute(input, output);
    }
    sw.Stop();

    var ms = sw.Elapsed.TotalMilliseconds / iterations;
    Console.WriteLine($"FFT {fftSize,4} : {ms,8:F4} ms");
}

Console.WriteLine();
Console.WriteLine("Spectrum analyzer latency (ms per call)");
Console.WriteLine("---------------------------------------");

var analyzer = new SpectrumAnalyzer(new SpectrumAnalyzerOptions
{
    FftSize = 8192,
    ZeroPaddingFactor = 1,
    WindowFunction = WindowFunctionType.Hann,
    IncludePhase = true
});

var sampleBlock = new float[8192];
for (var i = 0; i < sampleBlock.Length; i++)
{
    sampleBlock[i] = (float)(rand.NextDouble() * 2 - 1);
}

for (var i = 0; i < 50; i++)
{
    analyzer.Analyze(sampleBlock, 48000);
}

var benchIterations = 100;
var benchSw = Stopwatch.StartNew();
for (var i = 0; i < benchIterations; i++)
{
    analyzer.Analyze(sampleBlock, 48000);
}
benchSw.Stop();

var benchMs = benchSw.Elapsed.TotalMilliseconds / benchIterations;
Console.WriteLine($"FFT 8192 Analyze: {benchMs:F4} ms");
