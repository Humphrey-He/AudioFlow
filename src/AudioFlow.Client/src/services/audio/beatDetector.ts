/**
 * BeatDetector - detects BPM from audio spectrum data
 *
 * Algorithm:
 * 1. Calculate energy envelope from spectrum
 * 2. Find peaks (transients) in energy
 * 3. Calculate intervals between peaks
 * 4. Find dominant interval to estimate BPM
 */

export interface BeatDetectionResult {
  bpm: number;
  isOnBeat: boolean;
  confidence: number;
}

export class BeatDetector {
  private energyHistory: number[] = [];
  private peakTimes: number[] = [];
  private readonly maxHistoryLength = 200; // ~3 seconds at 60fps
  private readonly minPeakDistance = 10; // Minimum frames between peaks

  private lastBpm = 0;
  private lastBeatTime = 0;
  private readonly beatHoldFrames = 5;
  private beatHoldCounter = 0;

  /**
   * Process new spectrum data and return beat detection result
   */
  detect(magnitudes: number[]): BeatDetectionResult {
    const now = performance.now();

    // Calculate total energy (weighted towards bass)
    let energy = 0;
    const bassRange = Math.floor(magnitudes.length * 0.15); // Focus on low frequencies
    for (let i = 0; i < bassRange; i++) {
      const normalized = Math.max(0, (magnitudes[i] + 60) / 60);
      energy += normalized * (1 - i / bassRange * 0.5); // Weight bass higher
    }
    energy /= bassRange;

    // Add to history
    this.energyHistory.push(energy);
    if (this.energyHistory.length > this.maxHistoryLength) {
      this.energyHistory.shift();
    }

    // Detect peaks
    const isPeak = this.isEnergyPeak();

    if (isPeak) {
      this.peakTimes.push(now);

      // Keep only peaks from last 10 seconds
      this.peakTimes = this.peakTimes.filter((t) => now - t < 10000);

      // Calculate BPM if we have enough peaks
      if (this.peakTimes.length >= 4) {
        this.calculateBpm();
      }
    }

    // Check if currently on a beat
    const isOnBeat = this.checkOnBeat(now);

    return {
      bpm: this.lastBpm,
      isOnBeat,
      confidence: this.calculateConfidence(),
    };
  }

  private isEnergyPeak(): boolean {
    if (this.energyHistory.length < this.minPeakDistance + 2) {
      return false;
    }

    const current = this.energyHistory[this.energyHistory.length - 1];
    const windowStart = this.energyHistory.length - this.minPeakDistance - 1;

    // Check if current is higher than all points in the lookback window
    for (let i = windowStart; i < this.energyHistory.length - 1; i++) {
      if (this.energyHistory[i] >= current) {
        return false;
      }
    }

    // Also check if energy is above average (not just a local dip)
    const recentWindow = this.energyHistory.slice(-20);
    const avg = recentWindow.reduce((a, b) => a + b, 0) / recentWindow.length;

    return current > avg * 1.2; // 20% above average
  }

  private calculateBpm(): void {
    if (this.peakTimes.length < 4) return;

    // Calculate intervals between consecutive peaks
    const intervals: number[] = [];
    for (let i = 1; i < this.peakTimes.length; i++) {
      intervals.push(this.peakTimes[i] - this.peakTimes[i - 1]);
    }

    // Find the most common interval (ignore outliers)
    intervals.sort((a, b) => a - b);

    // Use median interval (robust to outliers)
    const medianInterval = intervals[Math.floor(intervals.length / 2)];

    // Convert to BPM
    const bpm = Math.round(60000 / medianInterval);

    // Clamp to reasonable range
    this.lastBpm = Math.max(60, Math.min(200, bpm));
  }

  private checkOnBeat(now: number): boolean {
    if (this.lastBpm <= 0 || this.lastBeatTime === 0) {
      return false;
    }

    const beatInterval = 60000 / this.lastBpm;
    const timeSinceLastBeat = now - this.lastBeatTime;

    // Check if we're within a beat window
    if (timeSinceLastBeat >= beatInterval * 0.7 && timeSinceLastBeat <= beatInterval * 1.3) {
      if (this.beatHoldCounter <= 0) {
        this.lastBeatTime = now;
        this.beatHoldCounter = this.beatHoldFrames;
        return true;
      }
    }

    this.beatHoldCounter--;
    return false;
  }

  private calculateConfidence(): number {
    if (this.peakTimes.length < 4) {
      return 0;
    }

    // Higher confidence with more consistent intervals
    if (this.peakTimes.length < 6) {
      return 0.3;
    }

    // Check interval variance
    const intervals: number[] = [];
    for (let i = 1; i < this.peakTimes.length; i++) {
      intervals.push(this.peakTimes[i] - this.peakTimes[i - 1]);
    }

    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance =
      intervals.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    // Lower variance = higher confidence
    const cv = stdDev / avg; // coefficient of variation
    if (cv < 0.1) return 0.9;
    if (cv < 0.2) return 0.7;
    if (cv < 0.3) return 0.5;
    return 0.3;
  }

  /**
   * Reset detector state
   */
  reset(): void {
    this.energyHistory = [];
    this.peakTimes = [];
    this.lastBpm = 0;
    this.lastBeatTime = 0;
    this.beatHoldCounter = 0;
  }
}

export const beatDetector = new BeatDetector();
