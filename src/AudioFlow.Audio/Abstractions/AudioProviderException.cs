namespace AudioFlow.Audio.Abstractions;

public sealed class AudioProviderException : Exception
{
    public AudioProviderErrorCode ErrorCode { get; }

    public AudioProviderException(AudioProviderErrorCode code, string message)
        : base(message)
    {
        ErrorCode = code;
    }

    public AudioProviderException(AudioProviderErrorCode code, string message, Exception innerException)
        : base(message, innerException)
    {
        ErrorCode = code;
    }
}
