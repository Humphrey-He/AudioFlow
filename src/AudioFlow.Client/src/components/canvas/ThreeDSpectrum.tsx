import { useRef, useEffect, useCallback } from 'react';
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

  // Touch control state
  const isDraggingRef = useRef(false);
  const previousTouchRef = useRef({ x: 0, y: 0 });
  const cameraAngleRef = useRef({ theta: 0, phi: Math.PI / 6 });
  const cameraDistanceRef = useRef(35);
  const pinchStartRef = useRef(0);

  const visualizationMode = usePlayerStore((s) => s.visualizationMode);
  const source = usePlayerStore((s) => s.source);
  const threeDConfig = usePlayerStore((s) => s.threeDConfig);

  // Update camera position based on touch controls
  const updateCameraPosition = useCallback(() => {
    const camera = cameraRef.current;
    if (!camera) return;

    const { theta, phi } = cameraAngleRef.current;
    const distance = cameraDistanceRef.current;

    camera.position.x = distance * Math.sin(theta) * Math.cos(phi);
    camera.position.y = distance * Math.sin(phi);
    camera.position.z = distance * Math.cos(theta) * Math.cos(phi);
    camera.lookAt(0, 0, 0);
  }, []);

  // Reset camera to default position
  const resetCamera = useCallback(() => {
    cameraAngleRef.current = { theta: 0, phi: Math.PI / 6 };
    cameraDistanceRef.current = 35;
    updateCameraPosition();
  }, [updateCameraPosition]);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current || visualizationMode !== '3d') return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Detect if mobile
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 15, 30);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer with mobile optimization
    const renderer = new THREE.WebGLRenderer({
      antialias: !isMobile, // Disable antialiasing on mobile for performance
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    // Lower pixel ratio on mobile for performance
    renderer.setPixelRatio(isMobile ? Math.min(window.devicePixelRatio, 1.5) : window.devicePixelRatio);
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
    const barCount = isMobile ? 32 : 64; // Fewer bars on mobile for performance
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

    // Touch event handlers
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        isDraggingRef.current = true;
        previousTouchRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      } else if (e.touches.length === 2) {
        // Pinch to zoom start
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchStartRef.current = Math.sqrt(dx * dx + dy * dy);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1 && isDraggingRef.current) {
        const deltaX = e.touches[0].clientX - previousTouchRef.current.x;
        const deltaY = e.touches[0].clientY - previousTouchRef.current.y;

        cameraAngleRef.current.theta -= deltaX * 0.01;
        cameraAngleRef.current.phi = Math.max(
          -Math.PI / 4,
          Math.min(Math.PI / 2, cameraAngleRef.current.phi + deltaY * 0.01)
        );

        previousTouchRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };

        updateCameraPosition();
      } else if (e.touches.length === 2) {
        // Pinch to zoom
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const delta = (pinchStartRef.current - distance) * 0.1;

        cameraDistanceRef.current = Math.max(15, Math.min(60, cameraDistanceRef.current + delta));
        pinchStartRef.current = distance;

        updateCameraPosition();
      }
    };

    const handleTouchEnd = () => {
      isDraggingRef.current = false;
    };

    // Mouse controls for desktop
    let isMouseDown = false;
    let previousMouse = { x: 0, y: 0 };

    const handleMouseDown = (e: MouseEvent) => {
      isMouseDown = true;
      previousMouse = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDown) return;

      const deltaX = e.clientX - previousMouse.x;
      const deltaY = e.clientY - previousMouse.y;

      cameraAngleRef.current.theta -= deltaX * 0.01;
      cameraAngleRef.current.phi = Math.max(
        -Math.PI / 4,
        Math.min(Math.PI / 2, cameraAngleRef.current.phi + deltaY * 0.01)
      );

      previousMouse = { x: e.clientX, y: e.clientY };
      updateCameraPosition();
    };

    const handleMouseUp = () => {
      isMouseDown = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraDistanceRef.current = Math.max(
        15,
        Math.min(60, cameraDistanceRef.current + e.deltaY * 0.05)
      );
      updateCameraPosition();
    };

    // Double click/tap to reset
    let lastTap = 0;
    const handleDoubleClick = () => {
      const now = Date.now();
      if (now - lastTap < 300) {
        resetCamera();
      }
      lastTap = now;
    };

    // Add event listeners
    const canvas = renderer.domElement;
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('dblclick', handleDoubleClick);

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

      const barCount = barsRef.current[0]?.count || 64;
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

      // Auto-rotate when not dragging (desktop only, slower on mobile)
      if (!isDraggingRef.current && !isMobile) {
        cameraAngleRef.current.theta += 0.002 * threeDConfig.rotationSpeed;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('dblclick', handleDoubleClick);

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
  }, [visualizationMode, source, threeDConfig, updateCameraPosition, resetCamera]);

  if (visualizationMode !== '3d') {
    return null;
  }

  return (
    <div className={styles.container}>
      <div ref={containerRef} className={styles.canvas} />
      <ThreeDControls onReset={resetCamera} />
    </div>
  );
}

function ThreeDControls({ onReset }: { onReset: () => void }) {
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

      <button className={styles.resetButton} onClick={onReset} title={t('3d.reset')}>
        ↺
      </button>
    </div>
  );
}
