import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { audioRuntime } from '@/services/audio/audioRuntime';
import styles from './BeatGame.module.css';

interface Score {
  perfect: number;
  great: number;
  good: number;
  miss: number;
  totalScore: number;
  combo: number;
  maxCombo: number;
}

interface BeatEvent {
  time: number;
  targetIndex: number;
  hit: boolean;
}

const HIGH_SCORES_KEY = 'audioflow_beatgame_highscores';
const TARGET_THRESHOLD = 0.75; // Bar must reach this height to be "hittable"
const POINTS = { perfect: 100, great: 50, good: 20, miss: 0 };

export function BeatGame() {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState<Score>({
    perfect: 0,
    great: 0,
    good: 0,
    miss: 0,
    totalScore: 0,
    combo: 0,
    maxCombo: 0,
  });
  const [highScore, setHighScore] = useState(0);
  const [lastResult, setLastResult] = useState<'perfect' | 'great' | 'good' | 'miss' | null>(null);
  const [targetIndex, setTargetIndex] = useState(32); // Middle of 64 bars

  const beatEventsRef = useRef<BeatEvent[]>([]);
  const lastMagnitudesRef = useRef<number[]>([]);
  const gameLoopRef = useRef<number | null>(null);
  const comboTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load high scores
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HIGH_SCORES_KEY);
      if (saved) {
        const scores = JSON.parse(saved);
        setHighScore(scores.totalScore || 0);
      }
    } catch {
      // Ignore
    }
  }, []);

  // Save high scores
  const saveHighScore = useCallback((newScore: number) => {
    try {
      const current = localStorage.getItem(HIGH_SCORES_KEY);
      const currentData = current ? JSON.parse(current) : { totalScore: 0 };
      if (newScore > (currentData.totalScore || 0)) {
        localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify({ totalScore: newScore }));
        setHighScore(newScore);
      }
    } catch {
      // Ignore
    }
  }, []);

  const startGame = useCallback(() => {
    setScore({
      perfect: 0,
      great: 0,
      good: 0,
      miss: 0,
      totalScore: 0,
      combo: 0,
      maxCombo: 0,
    });
    setLastResult(null);
    beatEventsRef.current = [];
    setIsPlaying(true);

    // Pick a random target bar
    setTargetIndex(Math.floor(Math.random() * 48) + 8); // Avoid edges
  }, []);

  const stopGame = useCallback(() => {
    setIsPlaying(false);
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
      comboTimeoutRef.current = null;
    }
    saveHighScore(score.totalScore);
  }, [score.totalScore, saveHighScore]);

  const handleTap = useCallback(() => {
    if (!isPlaying) return;

    const snapshot = audioRuntime.getSnapshot();
    const magnitudes = Array.from(snapshot.magnitudes);

    if (magnitudes.length === 0) return;

    const targetMagnitude = magnitudes[targetIndex] || -180;
    const normalizedMag = Math.max(0, (targetMagnitude + 60) / 60);

    let result: 'perfect' | 'great' | 'good' | 'miss' = 'miss';
    let points = 0;

    if (normalizedMag >= TARGET_THRESHOLD) {
      // Calculate timing based on recent peak activity
      const lastMags = lastMagnitudesRef.current;
      const wasRising = lastMags.length > targetIndex &&
        magnitudes[targetIndex] > (lastMags[targetIndex] || -180);

      // Determine timing accuracy
      if (wasRising) {
        result = 'perfect';
        points = POINTS.perfect;
      } else if (normalizedMag >= 0.85) {
        result = 'great';
        points = POINTS.great;
      } else if (normalizedMag >= TARGET_THRESHOLD) {
        result = 'good';
        points = POINTS.good;
      }
    }

    if (result === 'miss') {
      points = POINTS.miss;
    }

    setLastResult(result);

    // Update score
    setScore(prev => {
      const newCombo = result === 'miss' ? 0 : prev.combo + 1;
      const newMaxCombo = Math.max(prev.maxCombo, newCombo);
      const newTotal = prev.totalScore + points + (newCombo > 1 ? newCombo * 5 : 0);

      return {
        ...prev,
        [result]: prev[result] + 1,
        totalScore: newTotal,
        combo: newCombo,
        maxCombo: newMaxCombo,
      };
    });

    // Clear last result after a delay
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
    }
    comboTimeoutRef.current = setTimeout(() => {
      setLastResult(null);
    }, 500);

    // Randomize next target
    setTargetIndex(Math.floor(Math.random() * 48) + 8);

    // Store current magnitudes for next comparison
    lastMagnitudesRef.current = [...magnitudes];
  }, [isPlaying, targetIndex]);

  // Game loop for hit detection
  useEffect(() => {
    if (!isPlaying) return;

    const gameLoop = () => {
      const snapshot = audioRuntime.getSnapshot();
      const magnitudes = Array.from(snapshot.magnitudes);

      if (magnitudes.length > 0) {
        lastMagnitudesRef.current = [...magnitudes];
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current);
      }
    };
  }, []);

  if (!isPlaying) {
    return (
      <div className={styles.container}>
        <div className={styles.title}>{t('game.title')}</div>
        <div className={styles.instructions}>{t('game.instructions')}</div>

        {score.totalScore > 0 && (
          <div className={styles.finalScore}>
            <div className={styles.scoreLabel}>{t('game.score')}</div>
            <div className={styles.scoreValue}>{score.totalScore}</div>
            <div className={styles.stats}>
              <span className={styles.statPerfect}>P: {score.perfect}</span>
              <span className={styles.statGreat}>G: {score.great}</span>
              <span className={styles.statGood}>O: {score.good}</span>
              <span className={styles.statMiss}>M: {score.miss}</span>
            </div>
            <div className={styles.maxCombo}>
              {t('game.combo')}: {score.maxCombo}
            </div>
          </div>
        )}

        <div className={styles.highScore}>
          {t('game.highScore')}: {highScore}
        </div>

        <button onClick={startGame} className={styles.startButton}>
          {t('game.start')}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.gameHeader}>
        <div className={styles.currentScore}>
          <span className={styles.scoreLabel}>{t('game.score')}</span>
          <span className={styles.scoreValue}>{score.totalScore}</span>
        </div>
        <div className={styles.currentCombo}>
          <span className={styles.comboLabel}>{t('game.combo')}</span>
          <span className={styles.comboValue}>x{score.combo}</span>
        </div>
      </div>

      <div className={styles.gameArea} onClick={handleTap}>
        <div className={styles.targetZone}>
          <div
            className={styles.targetIndicator}
            style={{
              left: `${(targetIndex / 64) * 100}%`,
            }}
          />
        </div>
        <div className={styles.tapPrompt}>
          {lastResult ? t(`game.${lastResult}`) : t('game.tapPrompt')}
        </div>
      </div>

      <button onClick={stopGame} className={styles.stopButton}>
        {t('game.stop')}
      </button>
    </div>
  );
}