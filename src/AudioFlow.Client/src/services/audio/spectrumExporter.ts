/**
 * SpectrumExporter - exports spectrum data to CSV/JSON formats
 */

export interface SpectrumExportData {
  timestamp: string;
  sampleRate: number;
  fftSize: number;
  frequencies: Array<{ hz: number; db: number }>;
}

export interface SpectrumExportOptions {
  format: 'csv' | 'json';
  includeMetadata: boolean;
  filenamePrefix?: string;
}

const DEFAULT_SAMPLE_RATE = 44100;
const DEFAULT_FFT_SIZE = 1024;

/**
 * Convert magnitudes array to spectrum data with frequency values
 */
export function magnitudesToSpectrumData(
  magnitudes: number[],
  sampleRate: number = DEFAULT_SAMPLE_RATE,
  fftSize: number = DEFAULT_FFT_SIZE
): SpectrumExportData {
  const nyquist = sampleRate / 2;
  const hzPerBin = nyquist / (fftSize / 2);

  const frequencies = magnitudes.map((db, index) => ({
    hz: Math.round(index * hzPerBin),
    db: Math.round(db * 100) / 100, // Round to 2 decimal places
  }));

  return {
    timestamp: new Date().toISOString(),
    sampleRate,
    fftSize,
    frequencies,
  };
}

/**
 * Export spectrum data to CSV format
 */
export function exportToCSV(data: SpectrumExportData): void {
  const headers = ['Frequency (Hz)', 'Magnitude (dB)'];
  const rows = data.frequencies.map((f) => `${f.hz},${f.db.toFixed(2)}`);

  const metadata = [
    `# AudioFlow Spectrum Export`,
    `# Timestamp: ${data.timestamp}`,
    `# Sample Rate: ${data.sampleRate} Hz`,
    `# FFT Size: ${data.fftSize}`,
    `# Total Bins: ${data.frequencies.length}`,
    '',
    headers.join(','),
    ...rows,
  ];

  const csv = metadata.join('\n');
  downloadBlob(csv, 'text/csv', `${data.timestamp}.csv`);
}

/**
 * Export spectrum data to JSON format
 */
export function exportToJSON(data: SpectrumExportData): void {
  const json = JSON.stringify(data, null, 2);
  downloadBlob(json, 'application/json', `${data.timestamp}.json`);
}

/**
 * Export spectrum data to file
 */
export function exportSpectrum(
  magnitudes: number[],
  options: SpectrumExportOptions
): void {
  const data = magnitudesToSpectrumData(magnitudes);

  if (options.format === 'csv') {
    exportToCSV(data);
  } else {
    exportToJSON(data);
  }
}

/**
 * Download blob as file
 */
function downloadBlob(content: string, mimeType: string, filename: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `audioflow-${filename}`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Generate filename with timestamp
 */
export function generateFilename(prefix: string, extension: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${prefix}-${timestamp}.${extension}`;
}
