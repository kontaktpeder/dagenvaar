import { useEffect, useState, type ReactNode } from 'react';
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
import { sheetCardVariants, sheetSpring, KEYBOARD_PAD_TRANSITION } from '@/lib/motion';

interface CenteredPopupProps {
  onClose: () => void;
  children: ReactNode;
  /**
   * hug — shrinks to content (day preview, event detail)
   * sheet — fills the safe frame (create/edit/profile/day)
   */
  size?: 'hug' | 'sheet';
  className?: string;
  /** Higher z when stacked over another popup */
  zClassName?: string;
  /**
   * solid — dim behind card (default)
   * none — no dim (nested over an already-dimmed parent)
   */
  backdrop?: 'solid' | 'none';
  /**
   * Full exit (✕). Defaults to onClose.
   * Backdrop taps still use onClose (e.g. step-back in wizards).
   */
  onExit?: () => void;
}

const DISMISS_DIST = 110;
const DISMISS_VEL = 650;

const flyTween = {
  type: 'tween' as const,
  duration: 0.24,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

const returnTween = {
  type: 'tween' as const,
  duration: 0.18,
  ease: [0.32, 0.72, 0, 1] as [number, number, number, number],
};

/**
 * Modal shell: ✕ always works; dismiss drag only from the top grabber
 * so scrolling never fights the sheet.
 */
const CenteredPopup = ({
  onClose,
  children,
  size = 'sheet',
  className,
  zClassName = 'z-50',
  backdrop = 'solid',
  onExit,
}: CenteredPopupProps) => {
  const keyboardInset = useKeyboardInset();
  const keyboardOpen = keyboardInset > 24;
  const exit = onExit ?? onClose;
  const dragControls = useDragControls();

  const dragY = useMotionValue(0);
  const dragProgress = useTransform(dragY, (y) => Math.min(1, Math.max(0, Number(y)) / 160));
  const backdropOpacity = useTransform(dragProgress, [0, 1], [backdrop === 'solid' ? 0.4 : 0, 0]);

  const [padReady, setPadReady] = useState(false);
  const [flyingOut, setFlyingOut] = useState(false);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setPadReady(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (flyingOut) return;
    dragY.stop();
    dragY.set(0);
  }, [keyboardOpen, dragY, flyingOut]);

  // Sheets go edge-to-edge; hug keeps a little air
  const framePad =
    size === 'sheet'
      ? {
          paddingTop: 'env(safe-area-inset-top)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
          paddingBottom: keyboardOpen
            ? `${Math.min(keyboardInset + 8, typeof window !== 'undefined' ? window.innerHeight * 0.42 : keyboardInset)}px`
            : 'env(safe-area-inset-bottom)',
          transition: padReady ? KEYBOARD_PAD_TRANSITION : undefined,
        }
      : {
          paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
          paddingLeft: 'max(0.5rem, env(safe-area-inset-left))',
          paddingRight: 'max(0.5rem, env(safe-area-inset-right))',
          paddingBottom: keyboardOpen
            ? `${Math.min(keyboardInset + 8, typeof window !== 'undefined' ? window.innerHeight * 0.42 : keyboardInset)}px`
            : 'max(0.5rem, env(safe-area-inset-bottom))',
          transition: padReady ? KEYBOARD_PAD_TRANSITION : undefined,
        };

  const flyOutThenDismiss = () => {
    setFlyingOut(true);
    dragY.stop();
    const curY = dragY.get();
    const travel = window.innerHeight * 1.2;
    void animate(dragY, curY + travel, flyTween).then(() => {
      exit();
    });
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (flyingOut) return;
    const dy = info.offset.y;
    const vy = info.velocity.y;
    if (dy >= DISMISS_DIST || vy >= DISMISS_VEL) {
      flyOutThenDismiss();
      return;
    }
    void animate(dragY, 0, returnTween);
  };

  const canDrag = !keyboardOpen && !flyingOut;

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
        className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden"
        style={framePad}
      >
        <motion.div
          drag={canDrag ? 'y' : false}
          dragControls={dragControls}
          dragListener={false}
          dragMomentum={false}
          dragElastic={0}
          onDrag={() => {
            if (dragY.get() < 0) dragY.set(0);
          }}
          onDragEnd={handleDragEnd}
          style={{ y: dragY }}
          className={cn(
            'pointer-events-auto relative z-10 flex w-full max-w-md min-h-0 max-h-full',
            size === 'sheet' ? 'h-full' : 'h-auto',
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div
            variants={sheetCardVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={sheetSpring}
            className={cn(
              'relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-background shadow-soft-lg',
              size === 'sheet' ? 'rounded-[1.25rem]' : 'rounded-3xl',
              className,
            )}
          >
            {/* Grabber + ✕ — only place that starts swipe-dismiss */}
            <div className="relative z-30 flex shrink-0 items-center justify-between px-3 pt-2 pb-1">
              <div className="w-11" aria-hidden />
              <button
                type="button"
                className="flex flex-1 items-center justify-center py-2 touch-none"
                aria-label="Dra for å lukke"
                onPointerDown={(e) => {
                  if (canDrag) dragControls.start(e);
                }}
              >
                <span className="block h-1 w-10 rounded-full bg-muted-foreground/35" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  exit();
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
