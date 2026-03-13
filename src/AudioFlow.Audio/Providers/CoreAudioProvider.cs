using System.Buffers;
using AudioFlow.Audio.Abstractions;
using ManagedBass;

namespace AudioFlow.Audio.Providers;

public sealed class CoreAudioProvider : AudioProviderBase
{
    private int _recordHandle;

    public override string SourceName => "System Audio (CoreAudio)";

    public override AudioProviderCapabilities Capabilities => AudioProviderCapabilities.Capture;

    public override void Start()
    {
        if (State == AudioProviderState.Running)
        {
            return;
        }

        if (!Bass.Init())
        {
            RaiseError(new AudioProviderException(AudioProviderErrorCode.DeviceNotAvailable, "Failed to initialize ManagedBass."));
            return;
        }

        SampleRate = 48000;
        Channels = 2;

        _recordHandle = Bass.RecordStart(SampleRate, Channels, BassRecordFlags.RecordPause, OnRecordData);
        if (_recordHandle == 0)
        {
            RaiseError(new AudioProviderException(AudioProviderErrorCode.DeviceNotAvailable, "Failed to start recording."));
            return;
        }

        Bass.ChannelPlay(_recordHandle);
        RaiseStateChanged(AudioProviderState.Running);
    }

    public override void Stop()
    {
        if (_recordHandle != 0)
        {
            Bass.ChannelStop(_recordHandle);
            _recordHandle = 0;
        }

        RaiseStateChanged(AudioProviderState.Stopped);
    }

    public override void Pause()
    {
        if (_recordHandle != 0)
        {
            Bass.ChannelPause(_recordHandle);
        }
        RaiseStateChanged(AudioProviderState.Paused);
    }

    public override void Resume()
    {
        if (_recordHandle != 0)
        {
            Bass.ChannelPlay(_recordHandle);
        }
        RaiseStateChanged(AudioProviderState.Running);
    }

    public override bool TrySeek(TimeSpan position)
    {
        return false;
    }

    public override AudioFormat GetAudioFormat()
    {
        return new AudioFormat
        {
            SampleRate = SampleRate,
            Channels = Channels,
            BitDepth = 32,
            IsFloatingPoint = true
        };
    }

    private bool OnRecordData(int handle, IntPtr buffer, int length, IntPtr user)
    {
        if (length <= 0)
        {
            return true;
        }

        var samples = length / sizeof(float);
        var rented = ArrayPool<float>.Shared.Rent(samples);

        try
        {
            System.Runtime.InteropServices.Marshal.Copy(buffer, rented, 0, samples);
            RaiseDataAvailable(new ReadOnlySpan<float>(rented, 0, samples));
        }
        finally
        {
            ArrayPool<float>.Shared.Return(rented);
        }

        return true;
    }
}
