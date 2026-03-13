using System.Buffers;
using AudioFlow.Audio.Abstractions;
using NAudio.CoreAudioApi;
using NAudio.Wave;

namespace AudioFlow.Audio.Providers;

public sealed class WasapiAudioProvider : AudioProviderBase
{
    private readonly MMDevice? _device;
    private WasapiLoopbackCapture? _capture;
    private AudioFormat? _format;

    public WasapiAudioProvider(MMDevice? device = null)
    {
        _device = device;
    }

    public override string SourceName => _device?.FriendlyName ?? "System Audio (WASAPI)";

    public override AudioProviderCapabilities Capabilities =>
        AudioProviderCapabilities.Capture | AudioProviderCapabilities.DeviceSelection;

    public override void Start()
    {
        if (State == AudioProviderState.Running)
        {
            return;
        }

        try
        {
            _capture ??= _device != null
                ? new WasapiLoopbackCapture(_device)
                : new WasapiLoopbackCapture();

            _capture.DataAvailable -= OnDataAvailable;
            _capture.DataAvailable += OnDataAvailable;
            _capture.RecordingStopped -= OnRecordingStopped;
            _capture.RecordingStopped += OnRecordingStopped;

            SampleRate = _capture.WaveFormat.SampleRate;
            Channels = _capture.WaveFormat.Channels;
            _format = new AudioFormat
            {
                SampleRate = SampleRate,
                Channels = Channels,
                BitDepth = _capture.WaveFormat.BitsPerSample,
                IsFloatingPoint = _capture.WaveFormat.Encoding == WaveFormatEncoding.IeeeFloat
            };

            _capture.StartRecording();
            RaiseStateChanged(AudioProviderState.Running);
        }
        catch (Exception ex)
        {
            RaiseError(new AudioProviderException(AudioProviderErrorCode.DeviceNotAvailable, "Failed to start WASAPI capture.", ex));
        }
    }

    public override void Stop()
    {
        if (State == AudioProviderState.Stopped)
        {
            return;
        }

        try
        {
            _capture?.StopRecording();
        }
        finally
        {
            RaiseStateChanged(AudioProviderState.Stopped);
        }
    }

    public override void Pause()
    {
        Stop();
        RaiseStateChanged(AudioProviderState.Paused);
    }

    public override void Resume()
    {
        Start();
    }

    public override bool TrySeek(TimeSpan position)
    {
        return false;
    }

    public override AudioFormat GetAudioFormat()
    {
        return _format ?? new AudioFormat
        {
            SampleRate = SampleRate,
            Channels = Channels,
            BitDepth = 32,
            IsFloatingPoint = true
        };
    }

    private void OnRecordingStopped(object? sender, StoppedEventArgs e)
    {
        if (e.Exception != null)
        {
            RaiseError(new AudioProviderException(AudioProviderErrorCode.DeviceDisconnected, "WASAPI capture stopped.", e.Exception));
        }
        else
        {
            RaiseStateChanged(AudioProviderState.Stopped);
        }
    }

    private void OnDataAvailable(object? sender, WaveInEventArgs e)
    {
        if (e.BytesRecorded == 0 || _capture == null)
        {
            return;
        }

        var format = _capture.WaveFormat;
        var samples = e.BytesRecorded / (format.BitsPerSample / 8);
        var buffer = ArrayPool<float>.Shared.Rent(samples);

        try
        {
            if (format.Encoding == WaveFormatEncoding.IeeeFloat)
            {
                Buffer.BlockCopy(e.Buffer, 0, buffer, 0, e.BytesRecorded);
            }
            else if (format.BitsPerSample == 16)
            {
                var source = new ReadOnlySpan<byte>(e.Buffer, 0, e.BytesRecorded);
                for (var i = 0; i < samples; i++)
                {
                    var sample = BitConverter.ToInt16(source.Slice(i * 2, 2));
                    buffer[i] = sample / 32768f;
                }
            }
            else
            {
                return;
            }

            var span = new ReadOnlySpan<float>(buffer, 0, samples);
            RaiseDataAvailable(span);
        }
        finally
        {
            ArrayPool<float>.Shared.Return(buffer);
        }
    }
}
