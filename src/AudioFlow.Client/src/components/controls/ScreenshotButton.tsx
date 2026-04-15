import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './ScreenshotButton.module.css';

export function ScreenshotButton() {
  const { t } = useTranslation();
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleScreenshot = () => {
    // Find the canvas element
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      console.warn('Canvas not found');
      return;
    }

    // Get the data URL
    const dataUrl = canvas.toDataURL('image/png');

    // If we have a canvas ref, copy to it
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          canvasRef.current!.width = img.width;
          canvasRef.current!.height = img.height;
          ctx.drawImage(img, 0, 0);
        };
        img.src = dataUrl;
      }
    }

    setPreviewUrl(dataUrl);
    setShowPreview(true);
  };

  const handleDownload = () => {
    if (!previewUrl) return;

    const link = document.createElement('a');
    link.download = `audioflow-${Date.now()}.png`;
    link.href = previewUrl;
    link.click();
  };

  const handleCopy = async () => {
    if (!previewUrl) return;

    try {
      const response = await fetch(previewUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      alert('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback: download instead
      handleDownload();
    }
  };

  const handleClose = () => {
    setShowPreview(false);
    setPreviewUrl(null);
  };

  return (
    <>
      <button className={styles.screenshotButton} onClick={handleScreenshot} title={t('screenshot.capture')}>
        📷
      </button>

      {showPreview && previewUrl && (
        <div className={styles.previewOverlay} onClick={handleClose}>
          <div className={styles.previewModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.previewHeader}>
              <h3>{t('screenshot.preview')}</h3>
              <button className={styles.closeButton} onClick={handleClose}>×</button>
            </div>
            <img src={previewUrl} alt="Screenshot preview" className={styles.previewImage} />
            <div className={styles.previewActions}>
              <button className={styles.actionButton} onClick={handleDownload}>
                💾 {t('screenshot.download')}
              </button>
              <button className={styles.actionButton} onClick={handleCopy}>
                📋 {t('screenshot.copy')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
