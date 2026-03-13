using System.Buffers;
using AudioFlow.Audio.Abstractions;
using NAudio.Wave;
using TagLib;
using File = System.IO.File;

namespace AudioFlow.Audio.Providers;

public sealed class FileAudioProvider : AudioProviderBase
{
    private static readonly Dictionary<string, (DateTime LastWriteUtc, AudioMetadata Metadata)> MetadataCache = new(StringComparer.OrdinalIgnoreCase);
    private static readonly object MetadataLock = new();

    private readonly string _filePath;
    private AudioFileReader? _reader;
    private Thread? _playbackThread;
    private volatile bool _stopRequested;
    private AudioFormat? _format;
    private AudioMetadata? _metadata;

    public FileAudioProvider(string filePath)
    {
        _filePath = filePath;
    }

    public override string SourceName => Path.GetFileName(_filePath);

    public override AudioProviderCapabilities Capabilities =>
        AudioProviderCapabilities.Playback | AudioProviderCapabilities.Seek | AudioProviderCapabilities.Pause | AudioProviderCapabilities.Metadata;

    public AudioMetadata? Metadata => _metadata;

    public override void Start()
    {
        if (State == AudioProviderState.Running)
        {
            return;
        }

        if (!File.Exists(_filePath))
        {
            RaiseError(new AudioProviderException(AudioProviderErrorCode.FileNotFound, "Audio file not found."));
            return;
        }

        try
        {
            _reader ??= new AudioFileReader(_filePath);
            SampleRate = _reader.WaveFormat.SampleRate;
            Channels = _reader.WaveFormat.Channels;
            Duration = _reader.TotalTime;
            _format = new AudioFormat
            {
                SampleRate = SampleRate,
                Channels = Channels,
                BitDepth = _reader.WaveFormat.BitsPerSample,
                IsFloatingPoint = _reader.WaveFormat.Encoding == WaveFormatEncoding.IeeeFloat,
                BitRateKbps = _reader.WaveFormat.AverageBytesPerSecond > 0
                    ? (_reader.WaveFormat.AverageBytesPerSecond * 8) / 1000
                    : null
            };

            _metadata ??= LoadMetadata(_filePath, _reader.TotalTime);

            _stopRequested = false;
            _playbackThread = new Thread(PlaybackLoop)
            {
                IsBackground = true,
                Name = "FileAudioProvider Playback"
            };
            _playbackThread.Start();
            RaiseStateChanged(AudioProviderState.Running);
        }
        catch (Exception ex)
        {
            RaiseError(new AudioProviderException(AudioProviderErrorCode.FormatNotSupported, "Failed to open audio file.", ex));
        }
    }

    public override void Stop()
    {
        _stopRequested = true;
        _playbackThread?.Join(1000);
        RaiseStateChanged(AudioProviderState.Stopped);
    }

    public override void Pause()
    {
        if (State != AudioProviderState.Running)
        {
            return;
        }

        _stopRequested = true;
        _playbackThread?.Join(1000);
        RaiseStateChanged(AudioProviderState.Paused);
    }

    public override void Resume()
    {
        if (State == AudioProviderState.Running)
        {
            return;
        }

        Start();
    }

    public override bool TrySeek(TimeSpan position)
    {
        if (_reader == null)
        {
            return false;
        }

        if (position < TimeSpan.Zero || position > _reader.TotalTime)
        {
            return false;
        }

        _reader.CurrentTime = position;
        CurrentTime = position;
        return true;
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

    public override void Dispose()
    {
        base.Dispose();
        _reader?.Dispose();
    }

    private void PlaybackLoop()
    {
        if (_reader == null)
        {
            return;
        }

        const int bufferSamples = 2048;
        var buffer = ArrayPool<float>.Shared.Rent(bufferSamples * Channels);

        try
        {
            while (!_stopRequested)
            {
                var read = _reader.Read(buffer, 0, bufferSamples * Channels);
                if (read == 0)
                {
                    break;
                }

                CurrentTime = _reader.CurrentTime;
                RaiseDataAvailable(new ReadOnlySpan<float>(buffer, 0, read));

                var delayMs = (int)(read / (double)SampleRate / Channels * 1000);
                if (delayMs > 0)
                {
                    Thread.Sleep(delayMs);
                }
            }
        }
        catch (Exception ex)
        {
            RaiseError(new AudioProviderException(AudioProviderErrorCode.Unknown, "Playback failed.", ex));
        }
        finally
        {
            ArrayPool<float>.Shared.Return(buffer);
        }
    }

    private static AudioMetadata? LoadMetadata(string filePath, TimeSpan duration)
    {
        try
        {
            var fileInfo = new FileInfo(filePath);
            lock (MetadataLock)
            {
                if (MetadataCache.TryGetValue(filePath, out var cached) && cached.LastWriteUtc == fileInfo.LastWriteTimeUtc)
                {
                    return cached.Metadata;
                }
            }

            using var tagFile = TagLib.File.Create(filePath);
            var props = tagFile.Properties;

            var metadata = new AudioMetadata
            {
                Title = tagFile.Tag.Title,
                Artist = tagFile.Tag.FirstPerformer,
                Album = tagFile.Tag.Album,
                TrackNumber = tagFile.Tag.Track,
                Duration = duration,
                BitRateKbps = props.AudioBitrate,
                SampleRate = props.AudioSampleRate,
                BitDepth = props.BitsPerSample,
                Format = props.Description,
                FileSizeBytes = fileInfo.Length,
                LastModifiedUtc = fileInfo.LastWriteTimeUtc
            };

            lock (MetadataLock)
            {
                MetadataCache[filePath] = (fileInfo.LastWriteTimeUtc, metadata);
            }

            return metadata;
        }
        catch
        {
            return null;
        }
    }
}
