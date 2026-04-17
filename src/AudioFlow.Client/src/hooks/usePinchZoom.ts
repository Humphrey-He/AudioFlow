import { useRef, useEffect, useCallback } from 'react';

export interface GestureState {
  scale: number;
  translateX: number;
  translateY: number;
}

export interface UsePinchZoomOptions {
  minScale?: number;
  maxScale?: number;
  onGestureChange?: (state: GestureState) => void;
}

export function usePinchZoom(
  elementRef: React.RefObject<HTMLElement | null>,
  options: UsePinchZoomOptions = {}
) {
  const { minScale = 0.5, maxScale = 3, onGestureChange } = options;

  const stateRef = useRef<GestureState>({
    scale: 1,
    translateX: 0,
    translateY: 0,
  });

  const lastTouchesRef = useRef<{ x: number; y: number; dist: number }[]>([]);

  const getDistance = useCallback((touches: TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  const getCenter = useCallback((touches: TouchList) => {
    if (touches.length < 2) return { x: touches[0].clientX, y: touches[0].clientY };
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  }, []);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = getDistance(e.touches);
        lastTouchesRef.current = [
          { x: e.touches[0].clientX, y: e.touches[0].clientY, dist },
          { x: e.touches[1].clientX, y: e.touches[1].clientY, dist },
        ];
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();

        const currentDist = getDistance(e.touches);
        const lastDist = lastTouchesRef.current[0]?.dist || currentDist;

        // Calculate scale change
        let scaleDelta = currentDist / lastDist;
        let newScale = stateRef.current.scale * scaleDelta;
        newScale = Math.max(minScale, Math.min(maxScale, newScale));
        scaleDelta = newScale / stateRef.current.scale;

        // Calculate center position change
        const center = getCenter(e.touches);
        const lastCenter = getCenter(
          Array.from(lastTouchesRef.current.map((t) => ({ clientX: t.x, clientY: t.y }))) as unknown as TouchList
        );

        const dx = center.x - lastCenter.x;
        const dy = center.y - lastCenter.y;

        // Update state
        stateRef.current = {
          scale: newScale,
          translateX: stateRef.current.translateX + dx,
          translateY: stateRef.current.translateY + dy,
        };

        // Update last touches
        lastTouchesRef.current = [
          { x: e.touches[0].clientX, y: e.touches[0].clientY, dist: currentDist },
          { x: e.touches[1].clientX, y: e.touches[1].clientY, dist: currentDist },
        ];

        onGestureChange?.(stateRef.current);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        lastTouchesRef.current = [];
      }
    };

    // Add event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [elementRef, minScale, maxScale, onGestureChange, getDistance, getCenter]);

  const reset = useCallback(() => {
    stateRef.current = { scale: 1, translateX: 0, translateY: 0 };
    onGestureChange?.(stateRef.current);
  }, [onGestureChange]);

  return {
    state: stateRef.current,
    reset,
  };
}
