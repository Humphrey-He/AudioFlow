namespace AudioFlow.Audio.Abstractions;

public enum AudioProviderErrorCode
{
    DeviceNotAvailable = 1,
    PermissionDenied = 2,
    DeviceDisconnected = 3,
    FormatNotSupported = 4,
    FileNotFound = 5,
    Unknown = 99
}
