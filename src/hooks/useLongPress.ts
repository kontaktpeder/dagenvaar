import { useCallback, useRef } from 'react';

type Options = {
  onLongPress: () => void;
  ms?: number;
  moveTolerancePx?: number;
  /** Called when pointer is released / cancelled after arming */
  onDisarm?: () => void;
};

/**
 * Long-press without transform flicker.
 * Avoids pointerleave cancel (fires spuriously on iOS during hold).
 */
export function useLongPress({ onLongPress, ms = 450, moveTolerancePx = 14, onDisarm }: Options) {
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const firedRef = useRef(false);
  const armedRef = useRef(false);

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
      armedRef.current = true;
      startRef.current = { x: e.clientX, y: e.clientY };
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        firedRef.current = true;
        onLongPress();
      }, ms);
    },
    [onLongPress, ms],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!timerRef.current || !startRef.current) return;
      const dx = Math.abs(e.clientX - startRef.current.x);
      const dy = Math.abs(e.clientY - startRef.current.y);
      // Cancel long-press timer only — keep armed until pointer up so strip stays locked
      // while deciding between tap and swipe. Actual strip lock happens on long-press fire.
      if (dx > moveTolerancePx || dy > moveTolerancePx) clearTimer();
    },
    [clearTimer, moveTolerancePx],
  );

  const onPointerUp = useCallback(() => disarm(), [disarm]);
  const onPointerCancel = useCallback(() => disarm(), [disarm]);

  return {
    longPressHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
    /** true after the long-press callback has fired (reset on next pointerdown) */
    didFire: () => firedRef.current,
    cancelLongPress: disarm,
  };
}
