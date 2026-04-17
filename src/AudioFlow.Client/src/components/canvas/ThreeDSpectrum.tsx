import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useTranslation } from 'react-i18next';
import { usePlayerStore } from '@/stores/playerStore';
import { audioPlayer } from '@/services/audio/audioPlayer';
import { audioInput } from '@/services/audio/audioInput';
import { audioRuntime } from '@/services/audio/audioRuntime';
import { colorSchemes } from '@/types/visualization';
import styles from './ThreeDSpectrum.module.css';

export function ThreeDSpectrum() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const barsRef = useRef<THREE.InstancedMesh[]>([]);
  const animationRef = useRef<number | null>(null);

  const visualizationMode = usePlayerStore((s) => s.visualizationMode);
  const source = usePlayerStore((s) => s.source);
  const threeDConfig = usePlayerStore((s) => s.threeDConfig);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current || visualizationMode !== '3d') return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 15, 30);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);

    // Grid floor
    const gridHelper = new THREE.GridHelper(50, 50, 0x2a2a4e, 0x1a1a2e);
    gridHelper.position.y = -10;
    scene.add(gridHelper);

    // Create bar geometries for instancing
    const barCount = 64;
    const barWidth = 0.6;
    const barDepth = 0.6;

    barsRef.current = [];

    for (let row = 0; row < 2; row++) {
      const geometry = new THREE.BoxGeometry(barWidth, 1, barDepth);
      const material = new THREE.MeshPhongMaterial({
        color: 0x38d9a9,
        transparent: true,
        opacity: row === 0 ? 1.0 : 0.5,
      });

      const instancedMesh = new THREE.InstancedMesh(geometry, material, barCount);
      instancedMesh.position.z = row === 0 ? 0 : -3;
      instancedMesh.position.y = -5;

      const dummy = new THREE.Object3D();
      for (let i = 0; i < barCount; i++) {
        dummy.position.x = (i - barCount / 2) * 0.8;
        dummy.position.y = 0;
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
      }
      instancedMesh.instanceMatrix.needsUpdate = true;

      scene.add(instancedMesh);
      barsRef.current.push(instancedMesh);
    }

    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    let time = 0;
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      time += 0.01;

      let magnitudes: number[] = [];
      if (source === 'file' && audioPlayer.getFileName()) {
        magnitudes = Array.from(audioPlayer.getFrequencyData()).map((v) => {
          return v > 0 ? 20 * Math.log10(v / 255) : -180;
        });
      } else if (source === 'microphone' && audioInput.getIsActive()) {
        magnitudes = Array.from(audioInput.getFrequencyData()).map((v) => {
          return v > 0 ? 20 * Math.log10(v / 255) : -180;
        });
      } else {
        const snapshot = audioRuntime.getSnapshot();
        magnitudes = Array.from(snapshot.magnitudes);
      }

      const barCount = 64;
      const step = Math.max(1, Math.floor(magnitudes.length / barCount));
      const sampledMags: number[] = [];
      for (let i = 0; i < barCount; i++) {
        const idx = Math.min(i * step, magnitudes.length - 1);
        sampledMags.push(magnitudes[idx] || -180);
      }

      const scheme = colorSchemes[threeDConfig.colorScheme as keyof typeof colorSchemes];
      const dummy = new THREE.Object3D();

      barsRef.current.forEach((instancedMesh) => {
        for (let i = 0; i < barCount; i++) {
          const normalized = Math.max(0, Math.min(1, (sampledMags[i] + 60) / 60));
          const height = normalized * 20 + 0.1;

          dummy.position.x = (i - barCount / 2) * 0.8;
          dummy.position.y = height / 2 - 5;
          dummy.scale.set(1, height, 1);
          dummy.updateMatrix();

          instancedMesh.setMatrixAt(i, dummy.matrix);

          let color: string;
          if (normalized > 0.7) {
            color = scheme.high;
          } else if (normalized > 0.4) {
            color = scheme.mid;
          } else {
            color = scheme.low;
          }
          instancedMesh.setColorAt(i, new THREE.Color(color));
        }
        instancedMesh.instanceMatrix.needsUpdate = true;
        if (instancedMesh.instanceColor) {
          instancedMesh.instanceColor.needsUpdate = true;
        }
      });

      const radius = 35;
      camera.position.x = Math.sin(time * threeDConfig.rotationSpeed) * radius;
      camera.position.z = Math.cos(time * threeDConfig.rotationSpeed) * radius;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (rendererRef.current && rendererRef.current.domElement.parentNode) {
        rendererRef.current.domElement.parentNode.removeChild(rendererRef.current.domElement);
      }
      renderer.dispose();
      barsRef.current.forEach((mesh) => {
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material.dispose();
        }
      });
    };
  }, [visualizationMode, source, threeDConfig]);

  if (visualizationMode !== '3d') {
    return null;
  }

  return (
    <div className={styles.container}>
      <div ref={containerRef} className={styles.canvas} />
      <ThreeDControls />
    </div>
  );
}

function ThreeDControls() {
  const { t } = useTranslation();
  const threeDConfig = usePlayerStore((s) => s.threeDConfig);
  const updateThreeDConfig = usePlayerStore((s) => s.updateThreeDConfig);

  const colorOptions: Array<'fire' | 'aurora' | 'tech' | 'ocean'> = ['fire', 'aurora', 'tech', 'ocean'];

  return (
    <div className={styles.controls}>
      <div className={styles.controlGroup}>
        <span className={styles.label}>{t('3d.rotationSpeed')}</span>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={threeDConfig.rotationSpeed}
          onChange={(e) => updateThreeDConfig({ rotationSpeed: parseFloat(e.target.value) })}
          className={styles.slider}
        />
        <span className={styles.value}>{threeDConfig.rotationSpeed.toFixed(1)}</span>
      </div>

      <div className={styles.controlGroup}>
        <span className={styles.label}>{t('3d.colorScheme')}</span>
        <select
          value={threeDConfig.colorScheme}
          onChange={(e) => updateThreeDConfig({ colorScheme: e.target.value as 'fire' | 'aurora' | 'tech' | 'ocean' })}
          className={styles.select}
        >
          {colorOptions.map((color) => (
            <option key={color} value={color}>
              {t(`colorScheme.${color}`)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
