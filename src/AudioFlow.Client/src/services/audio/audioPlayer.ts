/**
 * AudioPlayer - handles audio file playback
 * Uses Web Audio API for decoding and analysis
 */
export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private startTime: number = 0;
  private pauseTime: number = 0;
  private isPlaying: boolean = false;
  private fileName: string = '';

  // Callbacks
  public onTimeUpdate?: (currentTime: number, duration: number) => void;
  public onEnded?: () => void;
  public onError?: (error: string) => void;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext(): void {
    try {
      this.audioContext = new AudioContext();
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 2048;
      this.analyserNode.smoothingTimeConstant = 0.8;

      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);

      // Don't connect source yet - will connect when playing
    } catch (err) {
      this.onError?.(`Failed to initialize audio: ${err}`);
    }
  }

  /**
   * Load audio file
   */
  async loadFile(file: File): Promise<{ duration: number; name: string }> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    this.stop();
    this.fileName = file.name;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;

          // Resume audio context if suspended (browser autoplay policy)
          if (this.audioContext?.state === 'suspended') {
            await this.audioContext.resume();
          }

          this.audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);

          // Create a silent source to connect the analyser for file analysis
          this.sourceNode = this.audioContext!.createBufferSource();
          this.sourceNode.buffer = this.audioBuffer;
          this.sourceNode.connect(this.analyserNode!);
          this.sourceNode.onended = () => {
            if (this.isPlaying) {
              this.isPlaying = false;
              this.onEnded?.();
            }
          };

          resolve({
            duration: this.audioBuffer.duration,
            name: file.name,
          });
        } catch (err) {
          reject(new Error(`Failed to decode audio: ${err}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Start or resume playback
   */
  play(startFrom?: number): void {
    if (!this.audioContext || !this.audioBuffer || !this.sourceNode) {
      this.onError?.('No audio loaded');
      return;
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    // Stop any existing playback
    try {
      this.sourceNode.stop();
    } catch {
      // Ignore if already stopped
    }

    // Create new source
    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.connect(this.analyserNode!);

    this.sourceNode.onended = () => {
      if (this.isPlaying) {
        this.isPlaying = false;
        this.onEnded?.();
      }
    };

    const offset = startFrom !== undefined ? startFrom : this.pauseTime;
    this.startTime = this.audioContext.currentTime - offset;
    this.sourceNode.start(0, offset);
    this.isPlaying = true;

    // Start time update interval
    this.startTimeUpdateInterval();
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (!this.isPlaying || !this.audioContext) return;

    this.pauseTime = this.audioContext.currentTime - this.startTime;
    this.sourceNode?.stop();
    this.isPlaying = false;
    this.stopTimeUpdateInterval();
  }

  /**
   * Stop playback and reset
   */
  stop(): void {
    this.sourceNode?.stop();
    this.sourceNode?.disconnect();
    this.isPlaying = false;
    this.pauseTime = 0;
    this.startTime = 0;
    this.stopTimeUpdateInterval();
  }

  /**
   * Seek to position
   */
  seek(time: number): void {
    if (!this.audioBuffer) return;

    const wasPlaying = this.isPlaying;
    if (wasPlaying) {
      this.sourceNode?.stop();
    }

    this.pauseTime = Math.max(0, Math.min(time, this.audioBuffer.duration));

    if (wasPlaying) {
      this.play(this.pauseTime);
    }
  }

  /**
   * Set volume (0-1)
   */
  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Get frequency data for visualization
   */
  getFrequencyData(): Uint8Array {
    if (!this.analyserNode) return new Uint8Array(512);
    const data = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(data);
    return data;
  }

  /**
   * Get time domain data for waveform
   */
  getTimeDomainData(): Uint8Array {
    if (!this.analyserNode) return new Uint8Array(512);
    const data = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteTimeDomainData(data);
    return data;
  }

  /**
   * Get current playback time
   */
  getCurrentTime(): number {
    if (!this.audioContext || !this.isPlaying) return this.pauseTime;
    return this.audioContext.currentTime - this.startTime;
  }

  /**
   * Get total duration
   */
  getDuration(): number {
    return this.audioBuffer?.duration ?? 0;
  }

  /**
   * Get file name
   */
  getFileName(): string {
    return this.fileName;
  }

  /**
   * Check if playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  private timeUpdateInterval: ReturnType<typeof setInterval> | null = null;

  private startTimeUpdateInterval(): void {
    this.stopTimeUpdateInterval();
    this.timeUpdateInterval = setInterval(() => {
      if (this.isPlaying) {
        this.onTimeUpdate?.(this.getCurrentTime(), this.getDuration());
      }
    }, 100);
  }

  private stopTimeUpdateInterval(): void {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
      this.timeUpdateInterval = null;
    }
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.stop();
    this.audioContext?.close();
    this.audioContext = null;
  }
}

export const audioPlayer = new AudioPlayer();
