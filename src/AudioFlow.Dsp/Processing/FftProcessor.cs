using System.Numerics;

namespace AudioFlow.Dsp.Processing;

public static class FftProcessor
{
    public static void Compute(Span<Complex> data, int length)
    {
        if (length == 0)
        {
            return;
        }

        if ((length & (length - 1)) != 0)
        {
            throw new ArgumentException("FFT size must be a power of two.", nameof(length));
        }

        if (data.Length < length)
        {
            throw new ArgumentException("Data span is too small.", nameof(data));
        }

        BitReverse(data, length);

        for (var len = 2; len <= length; len <<= 1)
        {
            var angle = -2.0 * Math.PI / len;
            var wlen = new Complex(Math.Cos(angle), Math.Sin(angle));

            for (var i = 0; i < length; i += len)
            {
                var w = Complex.One;
                var half = len >> 1;
                for (var j = 0; j < half; j++)
                {
                    var u = data[i + j];
                    var v = data[i + j + half] * w;
                    data[i + j] = u + v;
                    data[i + j + half] = u - v;
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
