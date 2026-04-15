using AudioFlow.Visualization.Exceptions;
using Xunit;

namespace AudioFlow.Visualization.Tests;

public sealed class VisualizationExceptionTests
{
    [Fact]
    public void FromPluginLoadFailed_ContainsPluginNameAndReason()
    {
        var ex = VisualizationException.FromPluginLoadFailed("TestPlugin", "Assembly not found");

        Assert.Equal(VisualizationErrorCode.PluginLoadFailed, ex.ErrorCode);
        Assert.Contains("TestPlugin", ex.Message);
        Assert.Contains("Assembly not found", ex.Message);
    }

    [Fact]
    public void FromIncompatibleVersion_ContainsVersions()
    {
        var expected = new Version(1, 0, 0);
        var actual = new Version(2, 0, 0);
        var ex = VisualizationException.FromIncompatibleVersion("MyPlugin", expected, actual);

        Assert.Equal(VisualizationErrorCode.IncompatiblePluginVersion, ex.ErrorCode);
        Assert.Contains("MyPlugin", ex.Message);
        Assert.Contains("1.0.0", ex.Message);
        Assert.Contains("2.0.0", ex.Message);
    }

    [Fact]
    public void FromRenderFailure_ContainsVisualizerNameAndInnerException()
    {
        var inner = new InvalidOperationException("Canvas disposed");
        var ex = VisualizationException.FromRenderFailure("BarVisualizer", inner);

        Assert.Equal(VisualizationErrorCode.RenderFailed, ex.ErrorCode);
        Assert.Contains("BarVisualizer", ex.Message);
        Assert.Same(inner, ex.InnerException);
    }

    [Fact]
    public void FromParameterNotFound_ContainsParameterAndVisualizerName()
    {
        var ex = VisualizationException.FromParameterNotFound("Color", "BarVisualizer");

        Assert.Equal(VisualizationErrorCode.ParameterNotFound, ex.ErrorCode);
        Assert.Contains("Color", ex.Message);
        Assert.Contains("BarVisualizer", ex.Message);
    }

    [Fact]
    public void Constructor_WithMessageOnly_PreservesErrorCode()
    {
        var ex = new VisualizationException(VisualizationErrorCode.InvalidRenderTarget, "Render surface is null");

        Assert.Equal(VisualizationErrorCode.InvalidRenderTarget, ex.ErrorCode);
        Assert.Equal("Render surface is null", ex.Message);
    }
}