using System.Numerics;

namespace AudioFlow.Dsp.Processing;

public static class FftProcessor
{
    public static void Compute(ReadOnlySpan<float> input, Span<Complex> output)
    {
        var n = input.Length;
        if (n == 0)
        {
            return;
        }

        if ((n & (n - 1)) != 0)
        {
            throw new ArgumentException("FFT size must be a power of two.", nameof(input));
        }

        if (output.Length < n)
        {
            throw new ArgumentException("Output span is too small.", nameof(output));
        }

        for (var i = 0; i < n; i++)
        {
            output[i] = new Complex(input[i], 0d);
        }

        BitReverse(output, n);

        for (var len = 2; len <= n; len <<= 1)
        {
            var angle = -2.0 * Math.PI / len;
            var wlen = new Complex(Math.Cos(angle), Math.Sin(angle));

            for (var i = 0; i < n; i += len)
            {
                var w = Complex.One;
                var half = len >> 1;
                for (var j = 0; j < half; j++)
                {
                    var u = output[i + j];
                    var v = output[i + j + half] * w;
                    output[i + j] = u + v;
                    output[i + j + half] = u - v;
                    w *= wlen;
                }
            }
        }
    }

    private static void BitReverse(Span<Complex> data, int n)
    {
        var j = 0;
        for (var i = 1; i < n; i++)
        {
            var bit = n >> 1;
            while ((j & bit) != 0)
            {
                j ^= bit;
                bit >>= 1;
            }

            j ^= bit;

            if (i < j)
            {
                (data[i], data[j]) = (data[j], data[i]);
            }
        }
    }
}
