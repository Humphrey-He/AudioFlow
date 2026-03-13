namespace AudioFlow.Audio.Abstractions;

public interface IAudioDeviceEnumerator
{
    IReadOnlyList<AudioDeviceInfo> GetCaptureDevices();
    AudioDeviceInfo? GetDefaultCaptureDevice();
}
