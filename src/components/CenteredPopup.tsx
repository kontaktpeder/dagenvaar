import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';
import { KEYBOARD_PAD_TRANSITION } from '@/lib/motion';

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
/** Tiny unfinished nudges only — soft return home. Larger moves use nearest + velocity. */
const NUDGE_DEADZONE_PX = 16;
const NUDGE_VEL = 350;
/** Cap leftover velocity when springing back to the same detent. */
const SAME_DETENT_VEL_CAP = 260;
/** Max raw handoff before animation scaling (px/s). */
const HANDOFF_VEL_CAP = 1600;
/** Spring is driven softer than commit velocity — avoids mid-flight brake hitch. */
const ANIM_VEL_SCALE = 0.38;
const ANIM_VEL_CAP = 640;
/** Fixed spring integration step (seconds). */
const SPRING_DT = 1 / 120;
/** EMA blend for touch velocity (higher = trust latest sample more). */
const VEL_EMA = 0.32;

/** Visible fraction of the frame at each detent (full = flush to top inset). */
const DETENT_VISIBLE: Record<SheetDetent, number> = {
  full: 1,
  half: 0.55,
};

type SpringOpts = {
  stiffness?: number;
  damping?: number;
  mass?: number;
  restDelta?: number;
  restSpeed?: number;
};

/** Detent settle — light bounce, stable mid-path */
const DETENT_SPRING: SpringOpts = {
  stiffness: 390,
  damping: 48,
  mass: 0.85,
  restDelta: 0.85,
  restSpeed: 20,
};

/** Enter / resize / return-home — softer, no fling */
const SETTLE_SPRING: SpringOpts = {
  stiffness: 360,
  damping: 46,
  mass: 0.9,
  restDelta: 0.85,
  restSpeed: 18,
};

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

function writeSheetY(el: HTMLElement | null, y: number) {
  if (!el) return;
  el.style.transform = `translate3d(0, ${y}px, 0)`;
}

/** iOS-style rubber band for overscroll past an edge (overshoot in px). */
function rubber(overshoot: number, dimension = 200, constant = 0.55): number {
  const sign = Math.sign(overshoot);
  const x = Math.abs(overshoot);
  return sign * ((x * dimension * constant) / (dimension + constant * x));
}

/** Map raw drag Y through rubber at top (past full) and soft resistance past frame bottom. */
function resistDragY(raw: number, frameH: number): number {
  if (raw < 0) return rubber(raw);
  if (raw > frameH) return frameH + rubber(raw - frameH, 160, 0.4);
  return raw;
}

/**
 * Continuity at finger → spring handoff.
 * Drop opposing velocity, scale down for animation (commit still uses raw vy).
 */
function animationHandoffVelocity(from: number, to: number, vy: number): number {
  const travel = to - from;
  if (Math.abs(travel) < 0.5) return 0;
  const toward = Math.sign(travel);
  let v = vy;
  if (v !== 0 && Math.sign(v) !== toward) {
    v = 0;
  }
  v *= ANIM_VEL_SCALE;
  const distCap = Math.abs(travel) * 2.8;
  if (Math.abs(v) > distCap) v = toward * distCap;
  if (Math.abs(v) > ANIM_VEL_CAP) v = toward * ANIM_VEL_CAP;
  if (Math.abs(v) > HANDOFF_VEL_CAP) v = toward * HANDOFF_VEL_CAP;
  return v;
}

/**
 * rAF spring with fixed timestep — same translate3d path as finger drag.
 */
function runSpring(options: {
  from: number;
  to: number;
  velocity?: number;
  spring?: SpringOpts;
  onUpdate: (y: number) => void;
  onComplete?: () => void;
}): () => void {
  const {
    from,
    to,
    velocity = 0,
    spring = DETENT_SPRING,
    onUpdate,
    onComplete,
  } = options;
  const stiffness = spring.stiffness ?? 390;
  const damping = spring.damping ?? 48;
  const mass = spring.mass ?? 0.85;
  const restDelta = spring.restDelta ?? 0.85;
  const restSpeed = spring.restSpeed ?? 20;

  let y = from;
  let v = animationHandoffVelocity(from, to, velocity);
  let last = performance.now();
  let acc = 0;
  let raf = 0;
  let cancelled = false;

  onUpdate(from);

  const integrate = (dt: number) => {
    const force = -stiffness * (y - to) - damping * v;
    const accel = force / mass;
    v += accel * dt;
    y += v * dt;
  };

  const step = (now: number) => {
    if (cancelled) return;
    acc += Math.min(0.064, Math.max(0, (now - last) / 1000));
    last = now;

    let guard = 0;
    while (acc >= SPRING_DT && guard < 8) {
      integrate(SPRING_DT);
      acc -= SPRING_DT;
      guard += 1;
      if (Math.abs(v) < restSpeed && Math.abs(y - to) < restDelta) {
        onUpdate(to);
        onComplete?.();
        return;
      }
    }

    onUpdate(y);
    raf = requestAnimationFrame(step);
  };

  raf = requestAnimationFrame(step);
  return () => {
    cancelled = true;
    cancelAnimationFrame(raf);
  };
}

/** Ease-out dismiss — smoother than a hard spring fling on long travel. */
function runEaseOut(options: {
  from: number;
  to: number;
  duration?: number;
  onUpdate: (y: number) => void;
  onComplete?: () => void;
}): () => void {
  const { from, to, onUpdate, onComplete } = options;
  const distance = Math.abs(to - from);
  const duration = options.duration ?? Math.min(0.38, Math.max(0.22, distance / 2200));
  const start = performance.now();
  let raf = 0;
  let cancelled = false;

  onUpdate(from);

  const step = (now: number) => {
    if (cancelled) return;
    const t = Math.min(1, (now - start) / (duration * 1000));
    const eased = 1 - (1 - t) ** 3;
    const y = from + (to - from) * eased;
    onUpdate(y);
    if (t >= 1) {
      onUpdate(to);
      onComplete?.();
      return;
    }
    raf = requestAnimationFrame(step);
  };

  raf = requestAnimationFrame(step);
  return () => {
    cancelled = true;
    cancelAnimationFrame(raf);
  };
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
 * Finger + settle both write translate3d on rAF — no Framer on the motion path.
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
  const sheetLayerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<GestureState | null>(null);
  const detentRef = useRef<SheetDetent>('full');
  const canDragRef = useRef(true);
  const frameHRef = useRef(700);
  const multiDetentRef = useRef(false);
  const yRef = useRef(
    typeof window !== 'undefined' ? window.innerHeight : 640,
  );
  const settleDragRef = useRef<(vy: number) => void>(() => {});
  const cancelSpringRef = useRef<(() => void) | null>(null);
  const animatingRef = useRef(false);

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

  const maxDim = backdrop === 'solid' ? (multiDetent ? 0.28 : 0.4) : 0;
  const [backdropOpen, setBackdropOpen] = useState(false);
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

  useEffect(() => {
    return () => {
      cancelSpringRef.current?.();
    };
  }, []);

  const setDragVisual = (on: boolean) => {
    const layer = sheetLayerRef.current;
    const card = cardRef.current;
    if (layer) {
      layer.style.willChange = on ? 'transform' : '';
    }
    if (card) {
      // Inline so React className re-renders can't put the shadow back mid-motion
      card.style.boxShadow = on ? 'none' : '';
    }
  };

  const setY = (y: number) => {
    yRef.current = y;
    writeSheetY(sheetLayerRef.current, y);
  };

  const stopSpring = () => {
    cancelSpringRef.current?.();
    cancelSpringRef.current = null;
    animatingRef.current = false;
  };

  const animateTo = (
    target: number,
    opts?: {
      velocity?: number;
      spring?: SpringOpts;
      keepCompositor?: boolean;
      mode?: 'spring' | 'easeOut';
      onComplete?: () => void;
    },
  ) => {
    stopSpring();
    const keepCompositor = opts?.keepCompositor ?? false;
    if (keepCompositor) setDragVisual(true);
    animatingRef.current = true;

    const finish = () => {
      cancelSpringRef.current = null;
      animatingRef.current = false;
      setY(target);
      if (keepCompositor) setDragVisual(false);
      opts?.onComplete?.();
    };

    if (opts?.mode === 'easeOut') {
      cancelSpringRef.current = runEaseOut({
        from: yRef.current,
        to: target,
        onUpdate: setY,
        onComplete: finish,
      });
      return;
    }

    cancelSpringRef.current = runSpring({
      from: yRef.current,
      to: target,
      velocity: opts?.velocity ?? 0,
      spring: opts?.spring ?? DETENT_SPRING,
      onUpdate: setY,
      onComplete: finish,
    });
  };

  const snapTo = (
    detent: SheetDetent,
    opts?: { velocity?: number; spring?: SpringOpts; keepCompositor?: boolean },
  ) => {
    detentRef.current = detent;
    const target = yForDetent(detent, frameHRef.current);
    animateTo(target, {
      velocity: opts?.velocity ?? 0,
      spring: opts?.spring ?? DETENT_SPRING,
      keepCompositor: opts?.keepCompositor ?? false,
    });
  };

  // Enter + keep detent aligned when frame height changes
  useEffect(() => {
    if (flyingOut || frameH <= 0) return;
    if (!enteredRef.current) {
      enteredRef.current = true;
      detentRef.current = startDetent;
      animateTo(yForDetent(startDetent, frameH), {
        spring: SETTLE_SPRING,
        keepCompositor: true,
      });
      return;
    }
    if (gestureRef.current?.dragging || animatingRef.current) return;
    const target = yForDetent(detentRef.current, frameH);
    if (Math.abs(yRef.current - target) < 6) return;
    animateTo(target, { spring: SETTLE_SPRING });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameH, flyingOut]);

  // Keyboard: expand to full so fields aren't clipped
  useEffect(() => {
    if (flyingOut || !enteredRef.current) return;
    if (!keyboardOpen) return;
    snapTo('full', { spring: SETTLE_SPRING, keepCompositor: true });
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

  const flyOutThenDismiss = (_velocity = 0) => {
    if (flyingOut) return;
    setFlyingOut(true);
    setBackdropOpen(false);
    gestureRef.current = null;
    const curY = yRef.current;
    const travel = Math.max(frameH * 1.05 - curY, frameH * 0.55);
    animateTo(curY + travel, {
      mode: 'easeOut',
      keepCompositor: true,
      onComplete: () => exit(),
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
    const y = yRef.current;
    const h = frameHRef.current;
    const current = detentRef.current;
    const currentY = yForDetent(current, h);
    const deltaFromCurrent = y - currentY;

    const positions = detents
      .map((d) => ({ d, y: yForDetent(d, h) }))
      .sort((a, b) => a.y - b.y);

    const peekY = positions[positions.length - 1]?.y ?? 0;
    const dismissLine = peekY + Math.max(100, (h - peekY) * 0.35);

    if (y >= dismissLine || (vy >= DISMISS_VEL && y > peekY * 0.35)) {
      flyOutThenDismiss(vy);
      return;
    }

    // Only tiny unfinished nudges: ease back home without a fling.
    if (Math.abs(deltaFromCurrent) < NUDGE_DEADZONE_PX && Math.abs(vy) < NUDGE_VEL) {
      snapTo(current, {
        velocity: 0,
        spring: SETTLE_SPRING,
        keepCompositor: true,
      });
      return;
    }

    // Standard commit: nearest detent to velocity-projected position.
    const projected = y + vy * 0.22;
    let best = positions[0]!;
    let bestDist = Math.abs(projected - best.y);
    for (const p of positions) {
      const dist = Math.abs(projected - p.y);
      if (dist < bestDist) {
        best = p;
        bestDist = dist;
      }
    }

    const returningHome = best.d === current;
    // Raw vy still used for commit (projection above); spring scales it in runSpring.
    const settleVy = returningHome
      ? Math.max(-SAME_DETENT_VEL_CAP, Math.min(SAME_DETENT_VEL_CAP, vy * 0.35))
      : vy;

    snapTo(best.d, {
      velocity: settleVy,
      spring: returningHome ? SETTLE_SPRING : DETENT_SPRING,
      keepCompositor: true,
    });
  };
  settleDragRef.current = settleDrag;

  // Single gesture path: pointer → direct translate3d
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const beginDrag = (state: GestureState, clientY: number, timeStamp: number) => {
      state.dragging = true;
      state.startY = clientY;
      state.lastY = clientY;
      state.lastAt = timeStamp;
      state.startDragY = yRef.current;
      stopSpring();
      setDragVisual(true);
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
        startDragY: yRef.current,
        velocityY: 0,
        dragging: false,
        fromGrabber,
        scrollEl:
          (target.closest('[data-sheet-scroll]') as HTMLElement | null) ?? getScrollEl(card),
      };
      gestureRef.current = state;

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
      const sample = ((event.clientY - state.lastY) / elapsed) * 1000;
      state.velocityY = state.velocityY * (1 - VEL_EMA) + sample * VEL_EMA;
      state.lastY = event.clientY;
      state.lastAt = event.timeStamp;

      const h = frameHRef.current;
      const raw = state.startDragY + event.clientY - state.startY;
      setY(resistDragY(raw, h));
    };

    const finishPointer = (event: PointerEvent) => {
      const state = gestureRef.current;
      if (!state || event.pointerId !== state.pointerId) return;
      gestureRef.current = null;
      if (state.dragging) {
        // Do NOT clear drag visual here — settle spring owns it until landed
        settleDragRef.current(state.velocityY);
      }
    };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useSheetLayout = size === 'sheet';
  const initialY = yRef.current;

  return (
    <div className={cn('fixed inset-0', zClassName)}>
      <div
        className="absolute inset-0 transition-opacity"
        style={{
          backgroundColor: backdrop === 'solid' ? 'hsl(var(--foreground))' : 'transparent',
          opacity: backdrop === 'solid' && backdropOpen ? maxDim : 0,
          transitionDuration: flyingOut ? '240ms' : '200ms',
          transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)',
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
        <div
          ref={sheetLayerRef}
          className={cn(
            'pointer-events-auto relative z-10 flex w-full max-w-md min-h-0',
            useSheetLayout
              ? 'h-full max-h-full self-stretch md:max-w-xl'
              : 'h-auto max-h-[min(92dvh,100%)]',
          )}
          style={{ transform: `translate3d(0, ${initialY}px, 0)` }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            ref={cardRef}
            role="dialog"
            aria-modal="true"
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
        </div>
      </div>
    </div>
  );
};

export default CenteredPopup;
