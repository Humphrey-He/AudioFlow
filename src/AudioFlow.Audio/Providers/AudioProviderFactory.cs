using System.Runtime.InteropServices;
using AudioFlow.Audio.Abstractions;
using NAudio.CoreAudioApi;

namespace AudioFlow.Audio.Providers;

public sealed class AudioProviderFactory : IAudioProviderFactory
{
    public IAudioProvider CreateSystemCaptureProvider()
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

    public IAudioProvider CreateFileProvider(string filePath)
    {
        return new FileAudioProvider(filePath);
    }

    public IReadOnlyList<AudioDeviceInfo> GetCaptureDevices()
    {
        if (!RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            return Array.Empty<AudioDeviceInfo>();
        }

        using var enumerator = new MMDeviceEnumerator();
        var devices = enumerator.EnumerateAudioEndPoints(DataFlow.Render, DeviceState.Active);
        var list = new List<AudioDeviceInfo>();

        var defaultDevice = enumerator.GetDefaultAudioEndpoint(DataFlow.Render, Role.Multimedia);
        foreach (var device in devices)
        {
            var isDefault = defaultDevice.ID == device.ID;
            list.Add(new AudioDeviceInfo(device.ID, device.FriendlyName, isDefault));
        }

        return list;
    }

    public WasapiAudioProvider CreateWasapiProvider(string deviceId)
    {
        using var enumerator = new MMDeviceEnumerator();
        var device = enumerator.GetDevice(deviceId);
        return new WasapiAudioProvider(device);
    }
}
