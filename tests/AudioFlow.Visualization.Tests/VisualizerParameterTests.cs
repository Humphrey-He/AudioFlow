using System.Text.Json;
using AudioFlow.Visualization.BuiltIn;
using AudioFlow.Visualization.Core;
using SkiaSharp;
using Xunit;

namespace AudioFlow.Visualization.Tests;

public sealed class VisualizerParameterTests
{
    [Fact]
    public void SerializeAndApply_RoundTrips()
    {
        var visualizer = new BarVisualizer();
        visualizer.Initialize();
        visualizer.SetParameter("AmplitudeScale", 70f);
        visualizer.SetParameter("Color", new SKColor(10, 20, 30));

        var json = VisualizerParameterSerializer.Serialize(visualizer);
        var policy = new VisualizerCompatibilityPolicy { AcceptSameMajorOnly = true };

        var applied = VisualizerParameterSerializer.TryApply(visualizer, json, policy);

        Assert.True(applied);
    }

    [Fact]
    public void ParameterSet_SerializesToJson()
    {
        var set = new VisualizerParameterSet("Bars", new Version(1, 0, 0),
            new Dictionary<string, JsonElement>());

        var json = set.ToJson();

        Assert.Contains("bars", json, StringComparison.OrdinalIgnoreCase);
    }
}
