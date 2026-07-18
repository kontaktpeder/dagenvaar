import { useCallback, useRef } from 'react';
import { hapticLight } from '@/lib/native/haptics';

type Options = {
  onLongPress: () => void;
  ms?: number;
  moveTolerancePx?: number;
  /** Called when pointer is released / cancelled after arming */
  onDisarm?: () => void;
};

/**
 * Long-press without transform flicker.
 * - Haptic when the hold is recognized
 * - Action runs on finger-up so a newly opened modal doesn't get a text selection
 *   under the still-pressed finger (e.g. time input "00")
 */
export function useLongPress({ onLongPress, ms = 450, moveTolerancePx = 14, onDisarm }: Options) {
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const firedRef = useRef(false);
  const armedRef = useRef(false);
  const pendingActionRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    startRef.current = null;
  }, []);

  const disarm = useCallback(() => {
    clearTimer();
    if (armedRef.current) {
      armedRef.current = false;
      onDisarm?.();
    }
  }, [clearTimer, onDisarm]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      firedRef.current = false;
      pendingActionRef.current = false;
      armedRef.current = true;
      startRef.current = { x: e.clientX, y: e.clientY };
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        firedRef.current = true;
        pendingActionRef.current = true;
        void hapticLight();
      }, ms);
    },
    [ms],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!timerRef.current || !startRef.current) return;
      const dx = Math.abs(e.clientX - startRef.current.x);
      const dy = Math.abs(e.clientY - startRef.current.y);
      if (dx > moveTolerancePx || dy > moveTolerancePx) clearTimer();
    },
    [clearTimer, moveTolerancePx],
  );

  const finish = useCallback(() => {
    const shouldRun = pendingActionRef.current;
    pendingActionRef.current = false;
    disarm();
    if (shouldRun) {
      // After the finger is up — avoids selecting inputs under the touch
      window.setTimeout(() => onLongPress(), 0);
    }
  }, [disarm, onLongPress]);

  return {
    longPressHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: finish,
    },
    /** true after the long-press was recognized (reset on next pointerdown) */
    didFire: () => firedRef.current,
    cancelLongPress: () => {
      pendingActionRef.current = false;
      disarm();
    },
  };
}
