import { useTranslation } from 'react-i18next';
import { Header } from '@/components/layout/Header';
import { ConnectionStatus } from '@/components/status/ConnectionStatus';
import { StatsPanel } from '@/components/status/StatsPanel';
import { DiagnosticsPanel } from '@/components/status/DiagnosticsPanel';
import { BeatIndicator } from '@/components/status/BeatIndicator';
import { PeakStats } from '@/components/status/PeakStats';
import { SpectrumCanvas } from '@/components/canvas/SpectrumCanvas';
import { ComparisonCanvas } from '@/components/canvas/ComparisonCanvas';
import { ThreeDSpectrum } from '@/components/canvas/ThreeDSpectrum';
import { VisualizationSelector } from '@/components/canvas/VisualizationSelector';
import { AudioPlayer } from '@/components/controls/AudioPlayer';
import { SourceSelector } from '@/components/controls/SourceSelector';
import { RecordingButton } from '@/components/controls/RecordingButton';
import { PresetShare } from '@/components/controls/PresetShare';
import { ControlsPanel } from '@/components/controls/ControlsPanel';
import { EffectsPanel } from '@/components/controls/EffectsPanel';
import { MobileMenu } from '@/components/layout/MobileMenu';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useAudioRuntime } from '@/hooks/useAudioRuntime';
import styles from './App.module.css';

export function App() {
  const { t } = useTranslation();
  useAudioRuntime();
  const preset = useSettingsStore((s) => s.preset);
  const applyPreset = useSettingsStore((s) => s.applyPreset);
  const errorMessage = useUiStore((s) => s.errorMessage);
  const visualizationMode = usePlayerStore((s) => s.visualizationMode);

  return (
    <div className={styles.app}>
      <Header preset={preset} onPresetChange={applyPreset} />
      <ConnectionStatus />
      {visualizationMode === '3d' ? (
        <ThreeDSpectrum />
      ) : visualizationMode === 'comparison' ? (
        <ComparisonCanvas />
      ) : (
        <SpectrumCanvas />
      )}
      <BeatIndicator />
      <MobileMenu title={t('menu.analysis')}>
        <PeakStats />
      </MobileMenu>
      <VisualizationSelector />
      <SourceSelector />
      <MobileMenu title={t('menu.tools')}>
        <RecordingButton />
        <PresetShare />
      </MobileMenu>
      <AudioPlayer />
      <MobileMenu title={t('menu.settings')}>
        <EffectsPanel />
        <ControlsPanel />
      </MobileMenu>
      <StatsPanel />
      <DiagnosticsPanel />
      <div className={`${styles.error} ${errorMessage ? styles.visible : ''}`}>
        {errorMessage || t('error.connect')}
      </div>
    </div>
  );
}
