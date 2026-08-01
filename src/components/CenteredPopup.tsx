import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
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
/** Tiny body threshold only to separate scroll intent from sheet drag. Grabber is 0. */
const BODY_ACTIVATE_PX = 2;

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

const fadeEase = [0.32, 0.72, 0, 1] as [number, number, number, number];

function getScrollEl(root: HTMLElement | null): HTMLElement | null {
  if (!root) return null;
  const marked = root.querySelector('[data-sheet-scroll]') as HTMLElement | null;
  if (marked) return marked;
  return root.querySelector('.overflow-y-auto, .overflow-y-scroll') as HTMLElement | null;
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
  return ordered.length ? ordered : ['full'];
}

type GestureState = {
  pointerId: number;
  startY: number;
  lastY: number;
  lastAt: number;
  startDragY: number;
  velocityY: number;
  dragging: boolean;
  fromGrabber: boolean;
  scrollEl: HTMLElement | null;
};

/**
 * Bottom sheet: follows the finger, snaps to detents (half / full), or dismisses.
 * Wizards use detents={['full']}; browse sheets use ['half','full'].
 *
 * Gesture path is a single pointer pipeline (no Framer drag). Backdrop opacity
 * stays fixed while dragging — only the sheet transform moves.
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
  const cardRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<GestureState | null>(null);
  const detentRef = useRef<SheetDetent>('full');
  const canDragRef = useRef(true);
  const frameHRef = useRef(700);
  const multiDetentRef = useRef(false);
  const settleDragRef = useRef<(vy: number) => void>(() => {});

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
  const [backdropOpen, setBackdropOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [padReady, setPadReady] = useState(false);
  const [flyingOut, setFlyingOut] = useState(false);
  const enteredRef = useRef(false);

  const canDrag = !keyboardOpen && !flyingOut;
  canDragRef.current = canDrag;
  frameHRef.current = frameH;
  multiDetentRef.current = multiDetent;

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      setPadReady(true);
      if (backdrop === 'solid') setBackdropOpen(true);
    });
    return () => window.cancelAnimationFrame(id);
  }, [backdrop]);

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
      ease: fadeEase,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameH, flyingOut]);

  // Keyboard: expand to full so fields aren't clipped
  useEffect(() => {
    if (flyingOut || !enteredRef.current) return;
    if (!keyboardOpen) return;
    snapTo('full', { type: 'tween', duration: 0.2, ease: fadeEase });
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
    setBackdropOpen(false);
    setIsDragging(false);
    gestureRef.current = null;
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
    const h = frameHRef.current;

    const positions = detents
      .map((d) => ({ d, y: yForDetent(d, h) }))
      .sort((a, b) => a.y - b.y);

    const peekY = positions[positions.length - 1]?.y ?? 0;
    const dismissLine = peekY + Math.max(100, (h - peekY) * 0.35);

    if (y >= dismissLine || (vy >= DISMISS_VEL && y > peekY * 0.35)) {
      flyOutThenDismiss();
      return;
    }

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
  settleDragRef.current = settleDrag;

  // Single gesture path: pointer → dragY.set (no Framer dragControls)
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const beginDrag = (state: GestureState, clientY: number, timeStamp: number) => {
      state.dragging = true;
      state.startY = clientY;
      state.lastY = clientY;
      state.lastAt = timeStamp;
      state.startDragY = dragY.get();
      dragY.stop();
      setIsDragging(true);
      try {
        card.setPointerCapture(state.pointerId);
      } catch {
        /* ignore */
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!canDragRef.current || event.button !== 0) {
        gestureRef.current = null;
        return;
      }
      const target = event.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable="true"]')) {
        gestureRef.current = null;
        return;
      }
      if (target.closest('[data-sheet-close]')) {
        gestureRef.current = null;
        return;
      }

      const fromGrabber = !!target.closest('[data-sheet-grabber]');
      const state: GestureState = {
        pointerId: event.pointerId,
        startY: event.clientY,
        lastY: event.clientY,
        lastAt: event.timeStamp,
        startDragY: dragY.get(),
        velocityY: 0,
        dragging: false,
        fromGrabber,
        scrollEl:
          (target.closest('[data-sheet-scroll]') as HTMLElement | null) ?? getScrollEl(card),
      };
      gestureRef.current = state;

      // Grabber: follow immediately (no dead zone)
      if (fromGrabber) {
        beginDrag(state, event.clientY, event.timeStamp);
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      const state = gestureRef.current;
      if (!canDragRef.current || !state || event.pointerId !== state.pointerId) return;

      const dy = event.clientY - state.startY;

      if (!state.dragging) {
        const scrollTop = state.scrollEl?.scrollTop ?? 0;
        const expandFromHalf =
          dy < -BODY_ACTIVATE_PX && multiDetentRef.current && detentRef.current !== 'full';
        const pullDownFromTop = dy > BODY_ACTIVATE_PX && scrollTop <= 1;
        if (!expandFromHalf && !pullDownFromTop) return;
        beginDrag(state, event.clientY, event.timeStamp);
      }

      const elapsed = Math.max(1, event.timeStamp - state.lastAt);
      state.velocityY = ((event.clientY - state.lastY) / elapsed) * 1000;
      state.lastY = event.clientY;
      state.lastAt = event.timeStamp;

      const h = frameHRef.current;
      const nextY = Math.max(0, Math.min(h, state.startDragY + event.clientY - state.startY));
      dragY.set(nextY);
    };

    const finishPointer = (event: PointerEvent) => {
      const state = gestureRef.current;
      if (!state || event.pointerId !== state.pointerId) return;
      gestureRef.current = null;
      if (state.dragging) {
        setIsDragging(false);
        settleDragRef.current(state.velocityY);
      }
    };

    // Block native scroll only while the sheet itself is being dragged
    const onTouchMove = (event: TouchEvent) => {
      if (gestureRef.current?.dragging) {
        event.preventDefault();
      }
    };

    card.addEventListener('pointerdown', onPointerDown);
    card.addEventListener('pointermove', onPointerMove);
    card.addEventListener('pointerup', finishPointer);
    card.addEventListener('pointercancel', finishPointer);
    card.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      card.removeEventListener('pointerdown', onPointerDown);
      card.removeEventListener('pointermove', onPointerMove);
      card.removeEventListener('pointerup', finishPointer);
      card.removeEventListener('pointercancel', finishPointer);
      card.removeEventListener('touchmove', onTouchMove);
    };
  }, [dragY]);

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
        initial={false}
        animate={{
          opacity: backdrop === 'solid' && backdropOpen ? maxDim : 0,
        }}
        transition={{
          duration: flyingOut ? 0.24 : 0.2,
          ease: fadeEase,
        }}
        style={{
          backgroundColor: backdrop === 'solid' ? 'hsl(var(--foreground))' : 'transparent',
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
          style={{
            y: dragY,
            willChange: isDragging ? 'transform' : 'auto',
          }}
          className={cn(
            'pointer-events-auto relative z-10 flex w-full max-w-md min-h-0',
            useSheetLayout
              ? 'h-full max-h-full self-stretch md:max-w-xl'
              : 'h-auto max-h-[min(92dvh,100%)]',
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            ref={cardRef}
            role="dialog"
            aria-modal="true"
            className={cn(
              'relative flex min-h-0 w-full flex-col overflow-hidden bg-background',
              'rounded-t-[1.25rem] rounded-b-none',
              !isDragging && 'shadow-soft-lg',
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
                tabIndex={-1}
              >
                <span className="block h-1.5 w-12 rounded-full bg-muted-foreground/40" />
              </button>
              <button
                type="button"
                data-sheet-close
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
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default CenteredPopup;
