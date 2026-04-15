import type { AudioSettings } from '@/types/common';

/**
 * AudioProcessor - Pure functions for audio data processing.
 * No React dependencies. Can be unit tested independently.
 */

/**
 * Normalize magnitude to 0-1 range based on dB scale
 */
export function normalizeMagnitude(magnitude: number, minDb: number = -60, maxDb: number = 0): number {
  return Math.max(0, Math.min(1, (magnitude - minDb) / (maxDb - minDb)));
}

/**
 * Calculate peak dB from magnitude array
 */
export function calculatePeakDb(magnitudes: number[]): number {
  if (magnitudes.length === 0) return -180;
  return Math.max(...magnitudes);
}

/**
 * Calculate average dB from magnitude array
 */
export function calculateAvgDb(magnitudes: number[]): number {
  if (magnitudes.length === 0) return -180;
  return magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;
}

/**
 * Apply smoothing settings (attack/decay simulation)
 * Returns smoothed magnitudes
 */
export function applySmoothing(
  current: number[],
  previous: number[],
  settings: Pick<AudioSettings, 'attack' | 'decay'>
): number[] {
  const { attack, decay } = settings;
  return current.map((curr, i) => {
    const prev = previous[i] ?? -180;
    if (curr > prev) {
      return prev + (curr - prev) * attack;
    } else {
      return prev + (curr - prev) * decay;
    }
  });
}

/**
 * Downsample magnitudes to target bin count
 */
export function downsampleMagnitudes(magnitudes: number[], targetBins: number): number[] {
  if (magnitudes.length === targetBins) return magnitudes;
  if (magnitudes.length < targetBins) {
    const result = new Array(targetBins).fill(-180);
    result.forEach((_, i) => {
      result[i] = magnitudes[Math.floor((i * magnitudes.length) / targetBins)] ?? -180;
    });
    return result;
  }

  const result: number[] = [];
  for (let i = 0; i < targetBins; i++) {
    const binIndex = Math.floor(Math.pow(magnitudes.length - 1, i / (targetBins - 1)));
    result.push(magnitudes[binIndex] ?? -180);
  }
  return result;
}
