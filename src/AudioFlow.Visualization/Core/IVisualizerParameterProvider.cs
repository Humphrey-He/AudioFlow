namespace AudioFlow.Visualization.Core;

public interface IVisualizerParameterProvider
{
    bool TryGetParameters(out VisualizerParameterSet parameterSet);
    void ApplyParameters(VisualizerParameterSet parameterSet);
}
