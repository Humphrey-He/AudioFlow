---

# RFC-001: 音频抓取模块设计

**标题**: 音频抓取模块设计  
**状态**: 草案 (Draft)  
**版本**: 1.0  
**负责人**: Humphrey He  
**日期**: 2026-03-13  
**目标版本**: Audio Flow v1.0.0

---

## 1. 概述

### 1.1 问题陈述

音频抓取模块是整个 Audio Flow 系统的"心脏"。为了实现丝滑的实时频谱效果，系统需要一个**低延迟、零内存分配（Zero-allocation）** 的数据抓取机制，能够同时支持：

1. **系统全局音频捕获** (WASAPI Loopback on Windows)
2. **本地文件播放** (MP3、FLAC、WAV)
3. **跨平台适配** (Windows、macOS、Linux)

现有的第三方库（如 NAudio、ManagedBass）虽然功能完整，但在以下方面存在不足：

- 内存分配频繁，导致 GC 压力
- 线程模型不够灵活，难以精细控制延迟
- 跨平台支持不统一

### 1.2 目标

设计并实现一个**统一的音频提供者接口** (`IAudioProvider`)，通过该接口：

- 屏蔽不同音频源的实现细节
- 提供高效、低延迟的 PCM 数据流
- 支持平台特定的优化（如 SIMD、WASAPI 的高优先级线程）
- 为上层 DSP 管道提供稳定的数据源

---

## 2. 设计详解

### 2.1 核心接口定义

#### 2.1.1 IAudioProvider 接口

```csharp
/// <summary>
/// 音频数据提供者接口。
/// 定义了从不同源（系统音频、文件等）抓取 PCM 数据的统一契约。
/// </summary>
public interface IAudioProvider : IDisposable
{
    // ========== 事件 ==========
    
    /// <summary>
    /// 当新的 PCM 数据块就绪时触发。
    /// 回调在音频线程上执行，应保证低延迟。
    /// </summary>
    event Action<ReadOnlySpan<float>> DataAvailable;
    
    /// <summary>
    /// 音频状态变化事件（运行、暂停、停止）。
    /// </summary>
    event Action<AudioProviderState> StateChanged;
    
    /// <summary>
    /// 发生错误时触发（如设备断开、权限不足）。
    /// </summary>
    event Action<AudioProviderException> ErrorOccurred;
    
    // ========== 属性 ==========
    
    /// <summary>
    /// 采样率（Hz）。示例值：44100、48000。
    /// </summary>
    int SampleRate { get; }
    
    /// <summary>
    /// 声道数。示例值：1（单声道）、2（立体声）。
    /// </summary>
    int Channels { get; }
    
    /// <summary>
    /// 当前是否正在运行。
    /// </summary>
    bool IsRunning { get; }
    
    /// <summary>
    /// 当前播放位置（仅对文件源有意义）。
    /// </summary>
    TimeSpan CurrentTime { get; }
    
    /// <summary>
    /// 总时长（仅对文件源有意义）。
    /// </summary>
    TimeSpan Duration { get; }
    
    /// <summary>
    /// 音频源的友好名称。
    /// </summary>
    string SourceName { get; }
    
    // ========== 方法 ==========
    
    /// <summary>
    /// 启动音频捕获。
    /// </summary>
    /// <exception cref="InvalidOperationException">已在运行</exception>
    /// <exception cref="AudioProviderException">设备初始化失败</exception>
    void Start();
    
    /// <summary>
    /// 停止音频捕获。
    /// </summary>
    void Stop();
    
    /// <summary>
    /// 暂停音频捕获（保持设备资源）。
    /// </summary>
    void Pause();
    
    /// <summary>
    /// 恢复音频捕获。
    /// </summary>
    void Resume();
    
    /// <summary>
    /// 设置播放位置（仅对文件源有意义）。
    /// </summary>
    /// <param name="position">目标位置</param>
    void Seek(TimeSpan position);
    
    /// <summary>
    /// 获取当前的音频格式信息。
    /// </summary>
    AudioFormat GetAudioFormat();
}
```

#### 2.1.2 相关枚举与模型

```csharp
/// <summary>
/// 音频提供者状态。
/// </summary>
public enum AudioProviderState
{
    /// <summary>未初始化</summary>
    Uninitialized = 0,
    
    /// <summary>运行中</summary>
    Running = 1,
    
    /// <summary>暂停</summary>
    Paused = 2,
    
    /// <summary>已停止</summary>
    Stopped = 3,
    
    /// <summary>错误状态</summary>
    Error = 4
}

/// <summary>
/// 音频格式信息。
/// </summary>
public class AudioFormat
{
    /// <summary>采样率（Hz）</summary>
    public int SampleRate { get; set; }
    
    /// <summary>声道数</summary>
    public int Channels { get; set; }
    
    /// <summary>位深（16、24、32）</summary>
    public int BitDepth { get; set; }
    
    /// <summary>是否为浮点格式</summary>
    public bool IsFloatingPoint { get; set; }
    
    /// <summary>比特率（kbps，仅对压缩格式有意义）</summary>
    public int? BitRate { get; set; }
}

/// <summary>
/// 音频提供者异常。
/// </summary>
public class AudioProviderException : Exception
{
    /// <summary>错误代码</summary>
    public AudioProviderErrorCode ErrorCode { get; }
    
    public AudioProviderException(AudioProviderErrorCode code, string message)
        : base(message)
    {
        ErrorCode = code;
    }
}

/// <summary>
/// 音频提供者错误代码。
/// </summary>
public enum AudioProviderErrorCode
{
    /// <summary>设备不可用</summary>
    DeviceNotAvailable = 1,
    
    /// <summary>权限不足</summary>
    PermissionDenied = 2,
    
    /// <summary>设备已断开</summary>
    DeviceDisconnected = 3,
    
    /// <summary>格式不支持</summary>
    FormatNotSupported = 4,
    
    /// <summary>文件不存在</summary>
    FileNotFound = 5,
    
    /// <summary>未知错误</summary>
    Unknown = 99
}
```

### 2.2 Windows WASAPI 环回实现

#### 2.2.1 设计目标

在 Windows 平台上，利用 **WASAPI (Windows Audio Session API)** 的 Loopback 功能实现系统全局音频捕获，同时满足以下约束：

- **零内存分配**: 使用 `ArrayPool<float>` 复用缓冲区
- **低延迟**: 在高优先级线程上处理音频回调
- **格式转换**: 自动处理 PCM 格式转换（如 16-bit PCM → float）
- **错误恢复**: 设备断开时自动重连或降级处理

#### 2.2.2 实现架构

```
WASAPI Loopback Device
        │
        ▼
┌─────────────────────────────────┐
│ WasapiAudioProvider             │
│ ├─ _capture: IMMDevice          │
│ ├─ _audioClient: IAudioClient   │
│ ├─ _renderClient: IAudioRenderClient
│ └─ _captureThread: Thread       │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ PCM Buffer Management           │
│ ├─ ArrayPool<float>             │
│ ├─ RingBuffer (无锁队列)        │
│ └─ Format Conversion (SIMD)     │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ DataAvailable Event             │
│ (ReadOnlySpan<float>)           │
└─────────────────────────────────┘
```

#### 2.2.3 关键实现要点

**（1）WASAPI 初始化流程**

```csharp
public class WasapiAudioProvider : IAudioProvider
{
    private IMMDevice _device;
    private IAudioClient _audioClient;
    private IAudioCaptureClient _captureClient;
    private Thread _captureThread;
    private volatile AudioProviderState _state = AudioProviderState.Uninitialized;
    
    /// <summary>
    /// 初始化 WASAPI 环回设备。
    /// 步骤：
    /// 1. 枚举音频设备，查找 Loopback 设备
    /// 2. 激活设备，获取 IAudioClient
    /// 3. 初始化音频客户端（采样率、声道、缓冲大小）
    /// 4. 启动捕获线程
    /// </summary>
    public void Initialize()
    {
        // 步骤 1: 获取设备枚举器
        var deviceEnumerator = (IMMDeviceEnumerator)new MMDeviceEnumerator();
        
        // 步骤 2: 查找 Loopback 设备
        _device = deviceEnumerator.GetDefaultAudioEndpoint(
            EDataFlow.eRender,           // 渲染端点
            ERole.eMultimedia            // 多媒体角色
        );
        
        // 步骤 3: 激活设备，获取 IAudioClient
        _audioClient = (IAudioClient)_device.Activate(
            typeof(IAudioClient).GUID,
            CLSCTX.CLSCTX_ALL,
            IntPtr.Zero
        );
        
        // 步骤 4: 获取默认格式
        _audioClient.GetMixFormat(out IntPtr formatPtr);
        var waveFormat = Marshal.PtrToStructure<WAVEFORMATEX>(formatPtr);
        
        SampleRate = waveFormat.nSamplesPerSec;
        Channels = waveFormat.nChannels;
        
        // 步骤 5: 初始化音频客户端
        uint bufferFrameCount = 0;
        _audioClient.Initialize(
            AUDCLNT_SHAREMODE.AUDCLNT_SHAREMODE_SHARED,
            AUDCLNT_STREAMFLAGS.AUDCLNT_STREAMFLAGS_LOOPBACK,
            10000000,  // 1 秒缓冲
            0,
            formatPtr,
            Guid.Empty
        );
        
        _audioClient.GetBufferSize(out bufferFrameCount);
        _bufferFrameCount = (int)bufferFrameCount;
        
        // 步骤 6: 获取捕获客户端
        _captureClient = (IAudioCaptureClient)_audioClient.GetService(
            typeof(IAudioCaptureClient).GUID
        );
        
        Marshal.FreeCoTaskMem(formatPtr);
    }
    
    /// <summary>
    /// 启动捕获线程。
    /// 线程优先级设置为 AboveNormal，确保实时性。
    /// </summary>
    public void Start()
    {
        if (_state == AudioProviderState.Running)
            throw new InvalidOperationException("Already running");
        
        _audioClient.Start();
        
        _captureThread = new Thread(CaptureThreadProc)
        {
            Priority = ThreadPriority.AboveNormal,
            Name = "WASAPI Capture Thread",
            IsBackground = true
        };
        _captureThread.Start();
        
        _state = AudioProviderState.Running;
        StateChanged?.Invoke(_state);
    }
    
    /// <summary>
    /// 捕获线程主循环。
    /// 持续从 WASAPI 缓冲区读取 PCM 数据。
    /// </summary>
    private void CaptureThreadProc()
    {
        try
        {
            while (_state == AudioProviderState.Running)
            {
                // 获取可用的帧数
                _captureClient.GetNextPacketSize(out uint packetLength);
                
                if (packetLength == 0)
                {
                    Thread.Sleep(1);  // 避免忙轮询
                    continue;
                }
                
                // 读取音频数据
                _captureClient.GetBuffer(
                    out IntPtr buffer,
                    out uint numFramesAvailable,
                    out AUDCLNT_BUFFERFLAGS flags,
                    out ulong position,
                    out ulong qpcPosition
                );
                
                // 格式转换并触发事件
                ProcessAudioBuffer(buffer, (int)numFramesAvailable);
                
                // 释放缓冲区
                _captureClient.ReleaseBuffer(numFramesAvailable);
            }
        }
        catch (Exception ex)
        {
            _state = AudioProviderState.Error;
            ErrorOccurred?.Invoke(
                new AudioProviderException(
                    AudioProviderErrorCode.Unknown,
                    $"Capture thread error: {ex.Message}"
                )
            );
        }
    }
}
```

**（2）零拷贝 PCM 格式转换**

```csharp
/// <summary>
/// 处理音频缓冲区，执行格式转换并触发 DataAvailable 事件。
/// 使用 SIMD 优化批量转换操作。
/// </summary>
private void ProcessAudioBuffer(IntPtr buffer, int numFrames)
{
    // 从 ArrayPool 获取临时缓冲区
    float[] floatBuffer = ArrayPool<float>.Shared.Rent(numFrames * Channels);
    
    try
    {
        // 转换格式：16-bit PCM → 32-bit float
        // 使用 Span<T> 避免额外拷贝
        var sourceSpan = new Span<short>(
            buffer.ToPointer(),
            numFrames * Channels
        );
        
        var destSpan = new Span<float>(floatBuffer, 0, numFrames * Channels);
        
        // SIMD 优化的转换
        ConvertPcmToFloat(sourceSpan, destSpan);
        
        // 触发事件，传递只读 Span
        DataAvailable?.Invoke(destSpan);
    }
    finally
    {
        // 归还缓冲区到池中
        ArrayPool<float>.Shared.Return(floatBuffer);
    }
}

/// <summary>
/// 使用 SIMD 指令集优化的 PCM 转换。
/// 16-bit PCM 范围：-32768 ~ 32767
/// 转换为 float 范围：-1.0 ~ 1.0
/// </summary>
private static void ConvertPcmToFloat(Span<short> source, Span<float> dest)
{
    const float maxInt16 = 32768f;
    int i = 0;
    
    // SIMD 批处理（如果支持 Vector<float>）
    if (Vector.IsHardwareAccelerated && source.Length >= Vector<float>.Count)
    {
        var vectorSize = Vector<float>.Count;
        var maxVector = new Vector<float>(maxInt16);
        
        for (; i <= source.Length - vectorSize; i += vectorSize)
        {
            // 将 short 数组转换为 float 向量
            var sourceVector = new Vector<float>(
                new[] {
                    source[i] / maxInt16,
                    source[i + 1] / maxInt16,
                    // ... 继续处理向量中的每个元素
                }
            );
            
            sourceVector.CopyTo(dest.Slice(i));
        }
    }
    
    // 处理剩余元素
    for (; i < source.Length; i++)
    {
        dest[i] = source[i] / maxInt16;
    }
}
```

**（3）错误处理与恢复**

```csharp
/// <summary>
/// 监听设备变化事件，实现自动重连。
/// </summary>
private class DeviceNotificationListener : IMMNotificationClient
{
    private readonly WasapiAudioProvider _provider;
    
    public void OnDeviceStateChanged(string deviceId, DEVICE_STATE newState)
    {
        if (newState != DEVICE_STATE.DEVICE_STATE_ACTIVE)
        {
            _provider._state = AudioProviderState.Error;
            _provider.ErrorOccurred?.Invoke(
                new AudioProviderException(
                    AudioProviderErrorCode.DeviceDisconnected,
                    "Audio device disconnected"
                )
            );
        }
    }
    
    // 其他回调方法...
}

public void Stop()
{
    if (_state == AudioProviderState.Stopped)
        return;
    
    _state = AudioProviderState.Stopped;
    
    try
    {
        _audioClient?.Stop();
        _captureThread?.Join(timeout: 5000);
    }
    catch (Exception ex)
    {
        ErrorOccurred?.Invoke(
            new AudioProviderException(
                AudioProviderErrorCode.Unknown,
                $"Error stopping capture: {ex.Message}"
            )
        );
    }
    finally
    {
        StateChanged?.Invoke(_state);
    }
}
```

### 2.3 本地文件播放实现

#### 2.3.1 设计目标

实现 `IAudioProvider` 接口的文件版本，支持 MP3、FLAC、WAV 格式，提供与 WASAPI 一致的数据接口。

#### 2.3.2 实现架构

```
Audio File (MP3/FLAC/WAV)
        │
        ▼
┌─────────────────────────────────┐
│ FileAudioProvider               │
│ ├─ _reader: AudioFileReader     │
│ ├─ _resamplingBuffer: float[]   │
│ └─ _playbackThread: Thread      │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ Resampling (if needed)          │
│ └─ LinearInterpolation          │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ DataAvailable Event             │
│ (ReadOnlySpan<float>)           │
└─────────────────────────────────┘
```

#### 2.3.3 关键实现要点

```csharp
public class FileAudioProvider : IAudioProvider
{
    private readonly string _filePath;
    private AudioFileReader _reader;
    private Thread _playbackThread;
    private volatile AudioProviderState _state = AudioProviderState.Uninitialized;
    
    // 重采样缓冲区（如果源采样率与目标不匹配）
    private float[] _resamplingBuffer;
    private int _targetSampleRate = 44100;
    
    public FileAudioProvider(string filePath, int targetSampleRate = 44100)
    {
        _filePath = filePath;
        _targetSampleRate = targetSampleRate;
    }
    
    /// <summary>
    /// 初始化音频文件读取器。
    /// </summary>
    public void Initialize()
    {
        if (!File.Exists(_filePath))
            throw new AudioProviderException(
                AudioProviderErrorCode.FileNotFound,
                $"File not found: {_filePath}"
            );
        
        try
        {
            _reader = new AudioFileReader(_filePath);
            SampleRate = _reader.WaveFormat.SampleRate;
            Channels = _reader.WaveFormat.Channels;
            Duration = _reader.TotalTime;
            SourceName = Path.GetFileName(_filePath);
        }
        catch (Exception ex)
        {
            throw new AudioProviderException(
                AudioProviderErrorCode.FormatNotSupported,
                $"Failed to open file: {ex.Message}"
            );
        }
    }
    
    /// <summary>
    /// 启动播放线程。
    /// 以固定间隔读取音频数据，模拟实时流。
    /// </summary>
    public void Start()
    {
        if (_state == AudioProviderState.Running)
            throw new InvalidOperationException("Already running");
        
        _playbackThread = new Thread(PlaybackThreadProc)
        {
            Priority = ThreadPriority.AboveNormal,
            Name = "File Playback Thread",
            IsBackground = true
        };
        _playbackThread.Start();
        
        _state = AudioProviderState.Running;
        StateChanged?.Invoke(_state);
    }
    
    /// <summary>
    /// 播放线程主循环。
    /// 定期读取音频块，触发 DataAvailable 事件。
    /// </summary>
    private void PlaybackThreadProc()
    {
        const int chunkSize = 2048;  // 每次读取的样本数
        float[] buffer = new float[chunkSize * Channels];
        
        try
        {
            while (_state == AudioProviderState.Running)
            {
                int samplesRead = _reader.Read(buffer, 0, buffer.Length);
                
                if (samplesRead == 0)
                {
                    // 文件播放完毕
                    _state = AudioProviderState.Stopped;
                    StateChanged?.Invoke(_state);
                    break;
                }
                
                // 触发事件
                DataAvailable?.Invoke(
                    new ReadOnlySpan<float>(buffer, 0, samplesRead)
                );
                
                // 根据采样率计算延迟，保持恒定的数据流速率
                int delayMs = (int)((samplesRead / (float)SampleRate) * 1000);
                Thread.Sleep(delayMs);
            }
        }
        catch (Exception ex)
        {
            _state = AudioProviderState.Error;
            ErrorOccurred?.Invoke(
                new AudioProviderException(
                    AudioProviderErrorCode.Unknown,
                    $"Playback error: {ex.Message}"
                )
            );
        }
    }
    
    /// <summary>
    /// 跳转到指定位置。
    /// </summary>
    public void Seek(TimeSpan position)
    {
        if (_reader == null)
            throw new InvalidOperationException("Not initialized");
        
        _reader.CurrentTime = position;
        CurrentTime = position;
    }
    
    public void Stop()
    {
        if (_state == AudioProviderState.Stopped)
            return;
        
        _state = AudioProviderState.Stopped;
        _playbackThread?.Join(timeout: 5000);
        StateChanged?.Invoke(_state);
    }
    
    public void Dispose()
    {
        Stop();
        _reader?.Dispose();
    }
}
```

### 2.4 跨平台适配策略

#### 2.4.1 平台检测与工厂模式

```csharp
/// <summary>
/// 音频提供者工厂，根据平台返回适当的实现。
/// </summary>
public class AudioProviderFactory
{
    public static IAudioProvider CreateLoopbackProvider()
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            