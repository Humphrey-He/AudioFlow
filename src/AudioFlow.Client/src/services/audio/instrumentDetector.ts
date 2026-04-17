/**
 * InstrumentDetector - detects instruments based on frequency spectrum peaks
 *
 * Frequency-Instrument Mapping (per RFC spec):
 * - 60-250Hz: Bass (贝斯)
 * - 250-500Hz: Bass Guitar (低音吉他)
 * - 500-2000Hz: Guitar/Piano/Vocal (吉他/钢琴/人声)
 * - 2000-4000Hz: Vocal Mid-High (人声中高频)
 * - 4000-8000Hz: Hi-Hat/Cymbals (镲片/高频泛音)
 * - 8000-20000Hz: Ultra High (极高频)
 */

export interface DetectedInstrument {
  name: string;
  nameEn: string;
  frequency: number; // Hz
  magnitude: number;  // dB
  position: number;   // 0-1 position on spectrum display
}

interface InstrumentRange {
  name: string;
  nameEn: string;
  minHz: number;
  maxHz: number;
  label: string; // i18n key
}

// Frequency ranges with sample rate assumption (44100Hz typical)
const instrumentRanges: InstrumentRange[] = [
  { name: '贝斯', nameEn: 'Bass', minHz: 60, maxHz: 250, label: 'instrument.bass' },
  { name: '低音吉他', nameEn: 'Bass Guitar', minHz: 250, maxHz: 500, label: 'instrument.bassGuitar' },
  { name: '吉他/钢琴/人声', nameEn: 'Guitar/Piano/Vocal', minHz: 500, maxHz: 2000, label: 'instrument.guitars' },
  { name: '人声中高频', nameEn: 'Vocal High', minHz: 2000, maxHz: 4000, label: 'instrument.vocalHigh' },
  { name: '镲片/高频泛音', nameEn: 'Hi-Hat/Cymbals', minHz: 4000, maxHz: 8000, label: 'instrument.hihat' },
  { name: '极高频', nameEn: 'Ultra High', minHz: 8000, maxHz: 20000, label: 'instrument.ultraHigh' },
];

export class InstrumentDetector {
  private sampleRate: number;
  private fftSize: number;

  constructor(sampleRate: number = 44100, fftSize: number = 1024) {
    this.sampleRate = sampleRate;
    this.fftSize = fftSize;
  }

  /**
   * Detect instruments from frequency magnitude data
   * @param magnitudes Array of frequency magnitudes in dB
   * @param maxInstruments Maximum number of instruments to detect (default: 3)
   * @returns Array of detected instruments sorted by magnitude
   */
  detect(magnitudes: number[], maxInstruments: number = 3): DetectedInstrument[] {
    if (magnitudes.length === 0) return [];

    const results: DetectedInstrument[] = [];
    const binCount = magnitudes.length;
    const nyquist = this.sampleRate / 2;
    const hzPerBin = nyquist / binCount;

    // Find peaks in each frequency range
    for (const range of instrumentRanges) {
      const minBin = Math.floor(range.minHz / hzPerBin);
      const maxBin = Math.min(Math.ceil(range.maxHz / hzPerBin), binCount - 1);

      if (minBin >= binCount || maxBin <= 0) continue;

      // Find peak in this range
      let maxMagnitude = -Infinity;
      let peakBin = minBin;

      for (let i = minBin; i <= maxBin; i++) {
        if (magnitudes[i] > maxMagnitude) {
          maxMagnitude = magnitudes[i];
          peakBin = i;
        }
      }

      // Only consider if above threshold (-40dB is a reasonable threshold)
      if (maxMagnitude > -40) {
        const frequency = Math.round(peakBin * hzPerBin);
        const position = peakBin / binCount;

        results.push({
          name: range.name,
          nameEn: range.nameEn,
          frequency,
          magnitude: maxMagnitude,
          position,
        });
      }
    }

    // Sort by magnitude (highest first) and limit
    results.sort((a, b) => b.magnitude - a.magnitude);
    return results.slice(0, maxInstruments);
  }

  /**
   * Get frequency for a given bin index
   */
  binToHz(bin: number): number {
    const nyquist = this.sampleRate / 2;
    return Math.round(bin * nyquist / (this.fftSize / 2));
  }

  /**
   * Get bin index for a given frequency
   */
  hzToBin(hz: number): number {
    const nyquist = this.sampleRate / 2;
    return Math.round(hz * this.fftSize / (2 * nyquist));
  }
}

export const instrumentDetector = new InstrumentDetector();
