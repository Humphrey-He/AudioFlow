using System.Text.Json;

namespace AudioFlow.Visualization.Core;

public static class VisualizerParameterSerializer
{
    public static string Serialize(IVisualizer visualizer)
    {
        if (visualizer is not IVisualizerParameterProvider provider)
        {
            throw new InvalidOperationException("Visualizer does not support parameter serialization.");
        }

        if (!provider.TryGetParameters(out var parameters))
        {
            throw new InvalidOperationException("Visualizer failed to provide parameters.");
        }

        return parameters.ToJson();
    }

    public static bool TryApply(IVisualizer visualizer, string json, VisualizerCompatibilityPolicy policy)
    {
        if (visualizer is not IVisualizerParameterProvider provider)
        {
            return false;
        }

        VisualizerParameterSet parameters;
        try
        {
            parameters = VisualizerParameterSet.FromJson(json);
        }
        catch (JsonException)
        {
            return false;
        }

        if (!string.Equals(parameters.VisualizerName, visualizer.Name, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (policy.AcceptSameMajorOnly && parameters.Version.Major != visualizer.Version.Major)
        {
            return false;
        }

        provider.ApplyParameters(parameters);
        return true;
    }
}
