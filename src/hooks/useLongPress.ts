import { useCallback, useRef } from 'react';

type Options = {
  onLongPress: () => void;
  ms?: number;
  moveTolerancePx?: number;
};

export function useLongPress({ onLongPress, ms = 520, moveTolerancePx = 10 }: Options) {
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const firedRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    startRef.current = null;
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      firedRef.current = false;
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
      if (dx > moveTolerancePx || dy > moveTolerancePx) clear();
    },
    [clear, moveTolerancePx],
  );

  const onPointerUp = useCallback(() => clear(), [clear]);
  const onPointerCancel = useCallback(() => clear(), [clear]);
  const onPointerLeave = useCallback(() => clear(), [clear]);

  return {
    longPressHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onPointerLeave,
    },
    /** true after the long-press callback has fired (reset on next pointerdown) */
    didFire: () => firedRef.current,
    cancelLongPress: clear,
  };
}
