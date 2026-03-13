namespace AudioFlow.Audio.Abstractions;

public sealed class AudioDeviceInfo
{
    public AudioDeviceInfo(string id, string name, bool isDefault)
    {
        Id = id;
        Name = name;
        IsDefault = isDefault;
    }

    public string Id { get; }
    public string Name { get; }
    public bool IsDefault { get; }
}
