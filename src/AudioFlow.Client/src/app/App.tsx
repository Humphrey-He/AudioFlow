import { useTranslation } from 'react-i18next';
import { Header } from '@/components/layout/Header';
import { ConnectionStatus } from '@/components/status/ConnectionStatus';
import { StatsPanel } from '@/components/status/StatsPanel';
import { SpectrumCanvas } from '@/components/canvas/SpectrumCanvas';
import { ControlsPanel } from '@/components/controls/ControlsPanel';
import { EffectsPanel } from '@/components/controls/EffectsPanel';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';
import { useAudioRuntime } from '@/hooks/useAudioRuntime';
import styles from './App.module.css';

export function App() {
  const { t } = useTranslation();
  const audio = useAudioRuntime();
  const preset = useSettingsStore((s) => s.preset);
  const applyPreset = useSettingsStore((s) => s.applyPreset);
  const errorMessage = useUiStore((s) => s.errorMessage);

  return (
    <div className={styles.app}>
      <Header preset={preset} onPresetChange={applyPreset} />
      <ConnectionStatus />
      <SpectrumCanvas audio={audio} />
      <EffectsPanel />
      <ControlsPanel />
      <StatsPanel
        frame={audio.frameCount}
        peakDb={audio.peakDb}
        avgDb={audio.avgDb}
        fps={0}
      />
      <div className={`${styles.error} ${errorMessage ? styles.visible : ''}`}>
        {errorMessage || t('error.connect')}
      </div>
    </div>
  );
}
