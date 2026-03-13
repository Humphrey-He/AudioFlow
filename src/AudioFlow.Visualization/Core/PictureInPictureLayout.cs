namespace AudioFlow.Visualization.Core;

public sealed class PictureInPictureLayout
{
    public PictureInPictureLayout(float insetRatio = 0.28f, float marginRatio = 0.04f)
    {
        InsetRatio = insetRatio;
        MarginRatio = marginRatio;
    }

    public float InsetRatio { get; }
    public float MarginRatio { get; }

    public (SkiaSharp.SKRect Main, SkiaSharp.SKRect Inset) Split(SkiaSharp.SKRect bounds)
    {
        var insetWidth = bounds.Width * InsetRatio;
        var insetHeight = bounds.Height * InsetRatio;
        var marginX = bounds.Width * MarginRatio;
        var marginY = bounds.Height * MarginRatio;

        var inset = new SkiaSharp.SKRect(
            bounds.Right - insetWidth - marginX,
            bounds.Top + marginY,
            bounds.Right - marginX,
            bounds.Top + marginY + insetHeight);

        return (bounds, inset);
    }
}
