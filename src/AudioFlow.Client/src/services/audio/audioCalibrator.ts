/**
 * AudioCalibrator - Test signal generator for system calibration
 * Generates pink noise, white noise, and sine wave sweeps
 */
export type SignalType = 'pink-noise' | 'white-noise' | 'sine-sweep' | 'sine-static';

export interface CalibratorConfig {
  signalType: SignalType;
  frequency: number;
  sweepStartFreq: number;
  sweepEndFreq: number;
  sweepDuration: number;
  amplitude: number;
}

export class AudioCalibrator {
  private audioContext: AudioContext | null = null;
  private oscillatorNode: OscillatorNode | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;

  private isRunning: boolean = false;
  private sweepInterval: ReturnType<typeof setInterval> | null = null;
  private currentSweepFreq: number = 0;

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
      this.gainNode.gain.value = 0.5;
      this.gainNode.connect(this.analyserNode!);
      this.analyserNode.connect(this.audioContext.destination);
    } catch (err) {
      console.error('Failed to initialize calibrator audio:', err);
    }
  }

  private ensureContext(): AudioContext {
    if (!this.audioContext) {
      this.initAudioContext();
    }
    if (this.audioContext!.state === 'suspended') {
      this.audioContext!.resume();
    }
    return this.audioContext!;
  }

  /**
   * Create pink noise buffer
   */
  private createPinkNoiseBuffer(context: AudioContext): AudioBuffer {
    const bufferSize = context.sampleRate * 2;
    const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const output = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;

      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;

      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    return buffer;
  }

  /**
   * Create white noise buffer
   */
  private createWhiteNoiseBuffer(context: AudioContext): AudioBuffer {
    const bufferSize = context.sampleRate * 2;
    const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const output = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    return buffer;
  }

  /**
   * Start playing a signal
   */
  start(config: CalibratorConfig): void {
    this.stop();

    const context = this.ensureContext();

    this.gainNode!.gain.value = config.amplitude;

    switch (config.signalType) {
      case 'pink-noise':
        this.playNoise(context, 'pink');
        break;
      case 'white-noise':
        this.playNoise(context, 'white');
        break;
      case 'sine-sweep':
        this.playSweep(context, config.sweepStartFreq, config.sweepEndFreq, config.sweepDuration);
        break;
      case 'sine-static':
        this.playStaticSine(context, config.frequency);
        break;
    }

    this.isRunning = true;
  }

  private playNoise(context: AudioContext, type: 'pink' | 'white'): void {
    const buffer = type === 'pink' ? this.createPinkNoiseBuffer(context) : this.createWhiteNoiseBuffer(context);

    this.noiseNode = context.createBufferSource();
    this.noiseNode.buffer = buffer;
    this.noiseNode.loop = true;
    this.noiseNode.connect(this.gainNode!);
    this.noiseNode.start();
  }

  private playStaticSine(context: AudioContext, frequency: number): void {
    this.oscillatorNode = context.createOscillator();
    this.oscillatorNode.type = 'sine';
    this.oscillatorNode.frequency.value = frequency;
    this.oscillatorNode.connect(this.gainNode!);
    this.oscillatorNode.start();
  }

  private playSweep(context: AudioContext, startFreq: number, endFreq: number, duration: number): void {
    this.currentSweepFreq = startFreq;
    const steps = 100;
    const stepDuration = (duration * 1000) / steps;
    const freqStep = (endFreq - startFreq) / steps;

    const playSweepStep = () => {
      if (!this.isRunning) return;

      this.oscillatorNode?.stop();
      this.oscillatorNode?.disconnect();

      this.oscillatorNode = context.createOscillator();
      this.oscillatorNode.type = 'sine';
      this.oscillatorNode.frequency.value = this.currentSweepFreq;
      this.oscillatorNode.connect(this.gainNode!);
      this.oscillatorNode.start();

      this.currentSweepFreq += freqStep;

      if (this.currentSweepFreq > endFreq) {
        this.currentSweepFreq = startFreq;
      }
    };

    playSweepStep();
    this.sweepInterval = setInterval(playSweepStep, stepDuration);
  }

  /**
   * Stop the signal
   */
  stop(): void {
    this.isRunning = false;

    if (this.sweepInterval) {
      clearInterval(this.sweepInterval);
      this.sweepInterval = null;
    }

    this.oscillatorNode?.stop();
    this.oscillatorNode?.disconnect();
    this.oscillatorNode = null;

    this.noiseNode?.stop();
    this.noiseNode?.disconnect();
    this.noiseNode = null;
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
   * Get current sweep frequency
   */
  getCurrentSweepFreq(): number {
    return this.currentSweepFreq;
  }

  /**
   * Check if calibrator is running
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Set amplitude
   */
  setAmplitude(amplitude: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, amplitude));
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

export const audioCalibrator = new AudioCalibrator();
