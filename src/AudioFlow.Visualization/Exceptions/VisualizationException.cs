namespace AudioFlow.Visualization.Exceptions;

/// <summary>
/// Visualization error codes.
/// </summary>
public enum VisualizationErrorCode
{
    /// <summary>Visualizer not initialized.</summary>
    NotInitialized = 1,

    /// <summary>Render target is invalid or disposed.</summary>
    InvalidRenderTarget = 2,

    /// <summary>Visualizer parameter not found.</summary>
    ParameterNotFound = 3,

    /// <summary>Parameter value type mismatch.</summary>
    ParameterTypeMismatch = 4,

    /// <summary>Visualizer plugin load failure.</summary>
    PluginLoadFailed = 5,

    /// <summary>Plugin version incompatible.</summary>
    IncompatiblePluginVersion = 6,

    /// <summary>Rendering exception.</summary>
    RenderFailed = 7,

    /// <summary>Unknown visualization error.</summary>
    Unknown = 99
}

/// <summary>
/// Exception thrown during visualization operations.
/// </summary>
public sealed class VisualizationException : Exception
{
    public VisualizationErrorCode ErrorCode { get; }

    public VisualizationException(VisualizationErrorCode code, string message)
        : base(message)
    {
        ErrorCode = code;
    }

    public VisualizationException(VisualizationErrorCode code, string message, Exception innerException)
        : base(message, innerException)
    {
        ErrorCode = code;
    }

    public static VisualizationException FromPluginLoadFailed(string pluginName, string reason)
        => new(VisualizationErrorCode.PluginLoadFailed,
            $"Failed to load visualizer plugin '{pluginName}': {reason}");

    public static VisualizationException FromIncompatibleVersion(string pluginName, Version expected, Version actual)
        => new(VisualizationErrorCode.IncompatiblePluginVersion,
            $"Plugin '{pluginName}' version mismatch. Expected: {expected}, Actual: {actual}");

    public static VisualizationException FromRenderFailure(string visualizerName, Exception innerException)
        => new(VisualizationErrorCode.RenderFailed,
            $"Render failed for visualizer '{visualizerName}'",
            innerException);

    public static VisualizationException FromParameterNotFound(string parameterName, string visualizerName)
        => new(VisualizationErrorCode.ParameterNotFound,
            $"Parameter '{parameterName}' not found in visualizer '{visualizerName}'");
}