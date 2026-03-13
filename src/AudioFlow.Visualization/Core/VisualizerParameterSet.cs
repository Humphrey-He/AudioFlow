using System.Text.Json;

namespace AudioFlow.Visualization.Core;

public sealed class VisualizerParameterSet
{
    public VisualizerParameterSet(string visualizerName, Version version, Dictionary<string, JsonElement> values)
    {
        VisualizerName = visualizerName;
        Version = version;
        Values = values;
    }

    public string VisualizerName { get; }
    public Version Version { get; }
    public Dictionary<string, JsonElement> Values { get; }

    public string ToJson()
    {
        return JsonSerializer.Serialize(this, SerializerOptions);
    }

    public static VisualizerParameterSet FromJson(string json)
    {
        var result = JsonSerializer.Deserialize<VisualizerParameterSet>(json, SerializerOptions);
        if (result == null)
        {
            throw new InvalidOperationException("Failed to deserialize VisualizerParameterSet.");
        }

        return result;
    }

    internal static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true
    };
}
