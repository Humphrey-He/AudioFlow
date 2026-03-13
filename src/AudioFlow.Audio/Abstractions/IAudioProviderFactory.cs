namespace AudioFlow.Audio.Abstractions;

public interface IAudioProviderFactory
{
    IAudioProvider CreateSystemCaptureProvider();
    IAudioProvider CreateFileProvider(string filePath);
    IReadOnlyList<AudioDeviceInfo> GetCaptureDevices();
}
