using System.Runtime.InteropServices;
using AudioFlow.Audio.Abstractions;
using NAudio.CoreAudioApi;

namespace AudioFlow.Audio.Providers;

public static class AudioProviderFactory
{
    public static IAudioProvider CreateSystemCaptureProvider()
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            return new WasapiAudioProvider();
        }

        if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
        {
            return new PulseAudioProvider();
        }

        if (RuntimeInformation.IsOSPlatform(OSPlatform.OSX))
        {
            return new CoreAudioProvider();
        }

        throw new PlatformNotSupportedException("Unsupported platform.");
    }

    public static IReadOnlyList<AudioDeviceInfo> GetWindowsCaptureDevices()
    {
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            return Array.Empty<AudioDeviceInfo>();
        }

        using var enumerator = new MMDeviceEnumerator();
        using var devices = enumerator.EnumerateAudioEndPoints(DataFlow.Render, DeviceState.Active);
        var list = new List<AudioDeviceInfo>();

        foreach (var device in devices)
        {
            var isDefault = enumerator.GetDefaultAudioEndpoint(DataFlow.Render, Role.Multimedia).ID == device.ID;
            list.Add(new AudioDeviceInfo(device.ID, device.FriendlyName, isDefault));
        }

        return list;
    }

    public static WasapiAudioProvider CreateWasapiProvider(string deviceId)
    {
        using var enumerator = new MMDeviceEnumerator();
        var device = enumerator.GetDevice(deviceId);
        return new WasapiAudioProvider(device);
    }
}
