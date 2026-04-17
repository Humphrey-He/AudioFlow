/**
 * SPLMeter - Sound Pressure Level measurement
 * Calculates and displays SPL in dB with various weightings
 */

export type SplWeighting = 'A' | 'C' | 'Z';

export interface SplConfig {
  weighting: SplWeighting;
  peakHold: boolean;
  referenceLevel: number;
}

export interface SplReading {
  current: number;
  peak: number;
  average: number;
  min: number;
  max: number;
  weighting: SplWeighting;
}

export class SplMeter {
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;

  private currentSpl: number = -100;
  private peakSpl: number = -100;
  private minSpl: number = 0;
  private maxSpl: number = -100;
  private splHistory: number[] = [];
  private readonly historySize = 200;

  private referenceLevel: number = 0.00002; // 20 µPa

  private isRunning: boolean = false;
  private animationFrame: number = 0;

  // Callbacks
  public onUpdate?: (reading: SplReading) => void;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext(): void {
    try {
      this.audioContext = new AudioContext();
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 2048;
      this.analyserNode.smoothingTimeConstant = 0.9;
    } catch (err) {
      console.error('Failed to initialize SPL meter:', err);
    }
  }

  /**
   * A-weighting curve coefficients (approximation)
   * Returns weighting in dB for a given frequency
   */
  private aWeighting(freq: number): number {
    const f = freq / 1000;
    const c1 = 12194.217 * 12194.217;
    const c2 = 20.598997 * 20.598997;

    const num = c1 * f * f * f * f;
    const den = (f * f + c2) * Math.sqrt((f * f + 107.65265 * 107.65265) * (f * f + 737.86223 * 737.86223)) * (f * f + 12194.217 * 12194.217);

    return 2.0 + 10 * Math.log10(num / den);
  }

  /**
   * C-weighting curve (simplified)
   */
  private cWeighting(freq: number): number {
    const f = freq / 1000;
    const c1 = 12194.217 * 12194.217;

    const num = c1 * f * f;
    const den = (f * f + 20.598997 * 20.598997) * (f * f + 12194.217 * 12194.217);

    return 3.0 + 10 * Math.log10(num / den);
  }

  /**
   * Calculate SPL from time domain data
   */
  private calculateSplFromTimeDomain(data: Float32Array, weighting: SplWeighting): number {
    let sumSquares = 0;
    const sampleRate = this.audioContext?.sampleRate || 48000;
    const binWidth = sampleRate / (data.length * 2);

    for (let i = 0; i < data.length; i++) {
      const freq = i * binWidth;
      let weight = 0;

      if (weighting === 'A') {
        weight = this.aWeighting(freq);
      } else if (weighting === 'C') {
        weight = this.cWeighting(freq);
      }

      const linearWeight = Math.pow(10, weight / 10);
      sumSquares += data[i] * data[i] * linearWeight;
    }

    const rms = Math.sqrt(sumSquares / data.length);

    if (rms < this.referenceLevel) {
      return -100;
    }

    return 20 * Math.log10(rms / this.referenceLevel);
  }

  /**
   * Start the SPL meter
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      const source = this.audioContext!.createMediaStreamSource(this.mediaStream);
      source.connect(this.analyserNode!);

      if (this.audioContext!.state === 'suspended') {
        await this.audioContext!.resume();
      }

      this.isRunning = true;
      this.measure();
    } catch (err) {
      console.error('Failed to start SPL meter:', err);
      throw err;
    }
  }

  /**
   * Stop the SPL meter
   */
  stop(): void {
    this.isRunning = false;

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
  }

  /**
   * Measurement loop
   */
  private measure = (): void => {
    if (!this.isRunning || !this.analyserNode) return;

    const timeData = new Float32Array(this.analyserNode.fftSize);
    this.analyserNode.getFloatTimeDomainData(timeData);

    // Calculate current SPL
    this.currentSpl = this.calculateSplFromTimeDomain(timeData, 'A');

    // Update peak
    if (this.currentSpl > this.peakSpl) {
      this.peakSpl = this.currentSpl;
    }

    // Update min
    if (this.minSpl === 0 || this.currentSpl < this.minSpl) {
      this.minSpl = this.currentSpl;
    }

    // Update max
    if (this.currentSpl > this.maxSpl) {
      this.maxSpl = this.currentSpl;
    }

    // Update history for average
    this.splHistory.push(this.currentSpl);
    if (this.splHistory.length > this.historySize) {
      this.splHistory.shift();
    }

    // Calculate Leq (energy average)
    const avgSpl = this.splHistory.reduce((a, b) => a + b, 0) / this.splHistory.length;

    this.onUpdate?.({
      current: this.currentSpl,
      peak: this.peakSpl,
      average: avgSpl,
      min: this.minSpl,
      max: this.maxSpl,
      weighting: 'A',
    });

    this.animationFrame = requestAnimationFrame(this.measure);
  };

  /**
   * Reset peak, min, max values
   */
  reset(): void {
    this.peakSpl = -100;
    this.minSpl = 0;
    this.maxSpl = -100;
    this.splHistory = [];
  }

  /**
   * Check if running
   */
  getIsRunning(): boolean {
    return this.isRunning;
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

export const splMeter = new SplMeter();
