import { useEffect, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react';
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  useDragControls,
  type PanInfo,
} from 'framer-motion';
import { cn } from '@/lib/utils';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';
import { sheetSpring, KEYBOARD_PAD_TRANSITION } from '@/lib/motion';

export type SheetDetent = 'half' | 'full';

interface CenteredPopupProps {
  onClose: () => void;
  children: ReactNode;
  /**
   * hug — height follows content (small overlays)
   * sheet — viewport-tall card; use with detents for half/full
   */
  size?: 'hug' | 'sheet';
  /**
   * Snap points. Default `['full']` (wizards).
   * `['half','full']` = Ruter-style browse sheet (calendar peeks behind).
   */
  detents?: SheetDetent[];
  /** Where the sheet opens. Defaults to the largest detent. */
  initialDetent?: SheetDetent;
  className?: string;
  zClassName?: string;
  backdrop?: 'solid' | 'none';
  onExit?: () => void;
}

const DISMISS_VEL = 900;
const PULL_ACTIVATE_PX = 8;

/** Visible fraction of the frame at each detent (full = flush to top inset). */
const DETENT_VISIBLE: Record<SheetDetent, number> = {
  full: 1,
  half: 0.55,
};

const flyTween = {
  type: 'tween' as const,
  duration: 0.24,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

const snapTween = {
  type: 'tween' as const,
  duration: 0.28,
  ease: [0.32, 0.72, 0, 1] as [number, number, number, number],
};

function getScrollEl(root: HTMLElement | null): HTMLElement | null {
  if (!root) return null;
  const marked = root.querySelector('[data-sheet-scroll]') as HTMLElement | null;
  if (marked) return marked;
  return root.querySelector('.overflow-y-auto, .overflow-y-scroll') as HTMLElement | null;
}

function getScrollTop(root: HTMLElement | null): number {
  return getScrollEl(root)?.scrollTop ?? 0;
}

/** True when the sheet body can actually scroll (content taller than viewport). */
function contentCanScroll(root: HTMLElement | null): boolean {
  const el = getScrollEl(root);
  if (!el) return false;
  return el.scrollHeight > el.clientHeight + 2;
}

function yForDetent(detent: SheetDetent, frameH: number): number {
  const visible = DETENT_VISIBLE[detent];
  return Math.max(0, Math.round(frameH * (1 - visible)));
}

function normalizeDetents(detents: SheetDetent[]): SheetDetent[] {
  const set = new Set(detents);
  const ordered: SheetDetent[] = [];
  if (set.has('full')) ordered.push('full');
  if (set.has('half')) ordered.push('half');
  // Sort by y ascending later via yForDetent; keep logical: full first in list for "largest"
  return ordered.length ? ordered : ['full'];
}

/**
 * Bottom sheet: follows the finger, snaps to detents (half / full), or dismisses.
 * Wizards use detents={['full']}; browse sheets use ['half','full'].
 */
const CenteredPopup = ({
  onClose,
  children,
  size = 'sheet',
  detents: detentsProp,
  initialDetent,
  className,
  zClassName = 'z-50',
  backdrop = 'solid',
  onExit,
}: CenteredPopupProps) => {
  const keyboardInset = useKeyboardInset();
  const keyboardOpen = keyboardInset > 24;
  const exit = onExit ?? onClose;
  const dragControls = useDragControls();
  const cardRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const pullRef = useRef<{ y: number; scrollTop: number; pointerId: number } | null>(null);
  const touchRef = useRef<{
    startY: number;
    lastY: number;
    lastAt: number;
    startDragY: number;
    velocityY: number;
    dragging: boolean;
    scrollEl: HTMLElement | null;
  } | null>(null);
  const detentRef = useRef<SheetDetent>('full');

  const detents = normalizeDetents(detentsProp ?? ['full']);
  const multiDetent = detents.length > 1 && size === 'sheet';
  const startDetent: SheetDetent =
    initialDetent && detents.includes(initialDetent)
      ? initialDetent
      : detents.includes('half') && multiDetent
        ? 'half'
        : 'full';

  const [frameH, setFrameH] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 700,
  );

  const dragY = useMotionValue(
    typeof window !== 'undefined' ? window.innerHeight : 640,
  );

  const maxDim = backdrop === 'solid' ? (multiDetent ? 0.28 : 0.4) : 0;
  const backdropOpacity = useTransform(dragY, (y) => {
    if (backdrop !== 'solid' || frameH <= 0) return 0;
    const t = Math.min(1, Math.max(0, 1 - Number(y) / frameH));
    return maxDim * (0.35 + 0.65 * t);
  });

  const [padReady, setPadReady] = useState(false);
  const [flyingOut, setFlyingOut] = useState(false);
  const enteredRef = useRef(false);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setPadReady(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => setFrameH(el.clientHeight || window.innerHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const snapTo = (detent: SheetDetent, tween = snapTween) => {
    detentRef.current = detent;
    const target = yForDetent(detent, frameH);
    void animate(dragY, target, tween);
  };

  // Enter + keep detent aligned when frame height changes
  useEffect(() => {
    if (flyingOut || frameH <= 0) return;
    if (!enteredRef.current) {
      enteredRef.current = true;
      detentRef.current = startDetent;
      void animate(dragY, yForDetent(startDetent, frameH), sheetSpring);
      return;
    }
    const target = yForDetent(detentRef.current, frameH);
    if (Math.abs(dragY.get() - target) < 6) return;
    void animate(dragY, target, {
      type: 'tween',
      duration: 0.15,
      ease: [0.32, 0.72, 0, 1],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameH, flyingOut]);

  // Keyboard: expand to full so fields aren't clipped
  useEffect(() => {
    if (flyingOut || !enteredRef.current) return;
    if (!keyboardOpen) return;
    snapTo('full', { type: 'tween', duration: 0.2, ease: [0.32, 0.72, 0, 1] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyboardOpen, flyingOut]);

  const framePad = {
    paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
    paddingLeft: 'env(safe-area-inset-left)',
    paddingRight: 'env(safe-area-inset-right)',
    paddingBottom: keyboardOpen
      ? `${Math.min(keyboardInset, typeof window !== 'undefined' ? window.innerHeight * 0.42 : keyboardInset)}px`
      : '0px',
    transition: padReady ? KEYBOARD_PAD_TRANSITION : undefined,
  };

  const flyOutThenDismiss = () => {
    if (flyingOut) return;
    setFlyingOut(true);
    dragY.stop();
    const curY = dragY.get();
    const travel = Math.max(frameH * 1.05 - curY, frameH * 0.55);
    void animate(dragY, curY + travel, flyTween).then(() => {
      exit();
    });
  };

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !flyingOut) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [flyingOut, onClose]);

  const settleDrag = (vy: number) => {
    if (flyingOut) return;
    const y = dragY.get();

    const positions = detents
      .map((d) => ({ d, y: yForDetent(d, frameH) }))
      .sort((a, b) => a.y - b.y);

    const peekY = positions[positions.length - 1]?.y ?? 0;
    const dismissLine = peekY + Math.max(100, (frameH - peekY) * 0.35);

    if (y >= dismissLine || (vy >= DISMISS_VEL && y > peekY * 0.35)) {
      flyOutThenDismiss();
      return;
    }

    // Velocity-biased nearest detent (follows the finger, then settles)
    const projected = y + vy * 0.18;
    let best = positions[0]!;
    let bestDist = Math.abs(projected - best.y);
    for (const p of positions) {
      const dist = Math.abs(projected - p.y);
      if (dist < bestDist) {
        best = p;
        bestDist = dist;
      }
    }
    snapTo(best.d);
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    settleDrag(info.velocity.y);
  };

  const canDrag = !keyboardOpen && !flyingOut;

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleTouchStart = (event: TouchEvent) => {
      if (!canDrag || event.touches.length !== 1) {
        touchRef.current = null;
        return;
      }
      const target = event.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable="true"]')) {
        touchRef.current = null;
        return;
      }
      const touch = event.touches[0]!;
      touchRef.current = {
        startY: touch.clientY,
        lastY: touch.clientY,
        lastAt: event.timeStamp,
        startDragY: dragY.get(),
        velocityY: 0,
        dragging: false,
        scrollEl: (target.closest('[data-sheet-scroll]') as HTMLElement | null) ?? getScrollEl(card),
      };
    };

    const handleTouchMove = (event: TouchEvent) => {
      const state = touchRef.current;
      if (!canDrag || !state || event.touches.length !== 1) return;

      const touch = event.touches[0]!;
      const dy = touch.clientY - state.startY;
      const scrollTop = state.scrollEl?.scrollTop ?? 0;
      const expandFromHalf = dy < -PULL_ACTIVATE_PX && multiDetent && detentRef.current !== 'full';
      const pullDownFromTop = dy > PULL_ACTIVATE_PX && scrollTop <= 1;

      if (!state.dragging) {
        if (!expandFromHalf && !pullDownFromTop) return;
        state.dragging = true;
        state.startY = touch.clientY;
        state.lastY = touch.clientY;
        state.lastAt = event.timeStamp;
        state.startDragY = dragY.get();
      }

      event.preventDefault();
      const elapsed = Math.max(1, event.timeStamp - state.lastAt);
      state.velocityY = ((touch.clientY - state.lastY) / elapsed) * 1000;
      state.lastY = touch.clientY;
      state.lastAt = event.timeStamp;
      dragY.stop();
      dragY.set(Math.max(0, Math.min(frameH, state.startDragY + touch.clientY - state.startY)));
    };

    const finishTouch = () => {
      const state = touchRef.current;
      touchRef.current = null;
      if (state?.dragging) settleDrag(state.velocityY);
    };

    card.addEventListener('touchstart', handleTouchStart, { passive: true });
    card.addEventListener('touchmove', handleTouchMove, { passive: false });
    card.addEventListener('touchend', finishTouch);
    card.addEventListener('touchcancel', finishTouch);
    return () => {
      card.removeEventListener('touchstart', handleTouchStart);
      card.removeEventListener('touchmove', handleTouchMove);
      card.removeEventListener('touchend', finishTouch);
      card.removeEventListener('touchcancel', finishTouch);
    };
  }, [canDrag, dragY, frameH, multiDetent, settleDrag]);

  const onCardPointerDown = (e: ReactPointerEvent) => {
    if (!canDrag || e.button !== 0 || e.pointerType === 'touch') return;
    const target = e.target as HTMLElement;
    if (target.closest('input, textarea, select, [contenteditable="true"]')) {
      pullRef.current = null;
      return;
    }
    if (target.closest('[data-sheet-grabber]')) {
      pullRef.current = null;
      return;
    }
    pullRef.current = {
      y: e.clientY,
      scrollTop: getScrollTop(cardRef.current),
      pointerId: e.pointerId,
    };
  };

  const onCardPointerMove = (e: ReactPointerEvent) => {
    if (!canDrag || !pullRef.current) return;
    if (pullRef.current.pointerId !== e.pointerId) return;
    const dy = e.clientY - pullRef.current.y;
    const scrollTop = getScrollTop(cardRef.current);
    const scrollable = contentCanScroll(cardRef.current);

    // Expand toward full even when scrolled, if pulling up from half
    if (dy < -PULL_ACTIVATE_PX && multiDetent && detentRef.current !== 'full') {
      try {
        cardRef.current?.setPointerCapture?.(e.pointerId);
      } catch {
        /* ignore */
      }
      dragControls.start(e);
      pullRef.current = null;
      return;
    }

    // Only block sheet-drag when the body is mid-scroll. Short lists / empty
    // space (scrollTop 0 or not scrollable) can always drag the sheet down.
    if (scrollable && scrollTop > 1) {
      if (dy > PULL_ACTIVATE_PX) pullRef.current = null;
      return;
    }
    if (Math.abs(dy) > PULL_ACTIVATE_PX) {
      try {
        cardRef.current?.setPointerCapture?.(e.pointerId);
      } catch {
        /* ignore */
      }
      dragControls.start(e);
      pullRef.current = null;
    }
  };

  const clearPull = () => {
    pullRef.current = null;
  };

  const useSheetLayout = size === 'sheet';

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 1 }}
      transition={{ duration: 0 }}
      className={cn('fixed inset-0', zClassName)}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundColor: backdrop === 'solid' ? 'hsl(var(--foreground))' : 'transparent',
          opacity: backdrop === 'solid' ? backdropOpacity : 0,
        }}
        onClick={flyingOut ? undefined : onClose}
        aria-hidden
      />

      <div
        ref={frameRef}
        className={cn(
          'absolute inset-0 flex justify-center pointer-events-none overflow-hidden',
          useSheetLayout ? 'items-stretch' : 'items-end',
        )}
        style={framePad}
      >
        <motion.div
          drag={canDrag ? 'y' : false}
          dragControls={dragControls}
          dragListener={false}
          dragMomentum={false}
          dragElastic={0}
          onDrag={() => {
            const y = dragY.get();
            if (y < 0) dragY.set(0);
            if (y > frameH) dragY.set(frameH);
          }}
          onDragEnd={handleDragEnd}
          style={{ y: dragY }}
          className={cn(
            'pointer-events-auto relative z-10 flex w-full max-w-md min-h-0',
            useSheetLayout
              ? 'h-full max-h-full self-stretch md:max-w-xl'
              : 'h-auto max-h-[min(92dvh,100%)]',
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div
            ref={cardRef}
            role="dialog"
            aria-modal="true"
            onPointerDown={onCardPointerDown}
            onPointerMove={onCardPointerMove}
            onPointerUp={clearPull}
            onPointerCancel={clearPull}
            className={cn(
              'relative flex min-h-0 w-full flex-col overflow-hidden bg-background shadow-soft-lg',
              'rounded-t-[1.25rem] rounded-b-none',
              useSheetLayout ? 'h-full' : 'h-auto max-h-full',
              className,
            )}
          >
            <div
              data-sheet-grabber
              className="relative z-30 flex shrink-0 items-center justify-between px-3 pt-1.5 pb-1"
              style={{ touchAction: 'none' }}
            >
              <div className="w-11" aria-hidden />
              <button
                type="button"
                className="flex flex-1 items-center justify-center py-3 touch-none cursor-grab active:cursor-grabbing"
                aria-label="Dra sheet"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  if (!canDrag) return;
                  try {
                    e.currentTarget.setPointerCapture?.(e.pointerId);
                  } catch {
                    /* ignore */
                  }
                  dragControls.start(e);
                }}
              >
                <span className="block h-1.5 w-12 rounded-full bg-muted-foreground/40" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  flyOutThenDismiss();
                }}
                className="relative z-40 w-11 h-11 flex items-center justify-center rounded-full bg-muted/90 text-muted-foreground"
                aria-label="Lukk"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default CenteredPopup;
