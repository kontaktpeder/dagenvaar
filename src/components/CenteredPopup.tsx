import { useEffect, useState, type ReactNode } from 'react';
import { motion, useMotionValue, useTransform, animate, type PanInfo } from 'framer-motion';
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
   * Optional full-exit control (separate from backdrop, which may step back).
   * Renders a large ✕ on the card, strictly inside its top-right corner.
   * Swipe-to-dismiss also prefers this when set.
   */
  onExit?: () => void;
}

const DISMISS_DIST = 100;
const DISMISS_VEL = 700;

const flyTween = {
  type: 'tween' as const,
  duration: 0.28,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

const returnTween = {
  type: 'tween' as const,
  duration: 0.22,
  ease: [0.32, 0.72, 0, 1] as [number, number, number, number],
};

/**
 * Modal shell with Photos-style dismiss:
 * free drag (no constraint rubber-band) → fly straight off-screen → unmount.
 * Enter animation lives on an inner layer so it never fights drag x/y.
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
  const dismiss = onExit ?? onClose;

  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const dragProgress = useTransform([dragX, dragY], ([dx, dy]) => {
    const d = Math.hypot(Number(dx), Number(dy));
    return Math.min(1, d / 160);
  });
  const backdropOpacity = useTransform(dragProgress, [0, 1], [backdrop === 'solid' ? 0.4 : 0, 0]);
  const cardScale = useTransform(dragProgress, [0, 1], [1, 0.96]);

  const [padReady, setPadReady] = useState(false);
  const [flyingOut, setFlyingOut] = useState(false);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setPadReady(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (flyingOut) return;
    dragX.stop();
    dragY.stop();
    dragX.set(0);
    dragY.set(0);
  }, [keyboardOpen, dragX, dragY, flyingOut]);

  const framePad = {
    paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
    paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
    paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
    paddingBottom: keyboardOpen
      ? `${Math.min(keyboardInset + 8, typeof window !== 'undefined' ? window.innerHeight * 0.42 : keyboardInset)}px`
      : 'max(0.75rem, env(safe-area-inset-bottom))',
    transition: padReady ? KEYBOARD_PAD_TRANSITION : undefined,
  } as const;

  const flyOutThenDismiss = (info: PanInfo) => {
    setFlyingOut(true);
    dragX.stop();
    dragY.stop();

    const curX = dragX.get();
    const curY = dragY.get();

    const speed = Math.hypot(info.velocity.x, info.velocity.y);
    const useVel = speed > 350;
    let dirX = useVel ? info.velocity.x : info.offset.x;
    let dirY = useVel ? info.velocity.y : info.offset.y;
    const dirLen = Math.hypot(dirX, dirY);
    if (dirLen < 1) {
      dirX = 0;
      dirY = 1;
    } else {
      dirX /= dirLen;
      dirY /= dirLen;
    }

    const travel = Math.max(window.innerWidth, window.innerHeight) * 1.35;

    void Promise.all([
      animate(dragX, curX + dirX * travel, flyTween),
      animate(dragY, curY + dirY * travel, flyTween),
    ]).then(() => {
      dismiss();
    });
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (flyingOut) return;
    const dist = Math.hypot(info.offset.x, info.offset.y);
    const vel = Math.hypot(info.velocity.x, info.velocity.y);
    if (dist >= DISMISS_DIST || vel >= DISMISS_VEL) {
      flyOutThenDismiss(info);
      return;
    }
    void animate(dragX, 0, returnTween);
    void animate(dragY, 0, returnTween);
  };

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
        {/* Drag layer: only x/y/scale — never shares y with enter variants */}
        <motion.div
          drag={!keyboardOpen && !flyingOut}
          dragMomentum={false}
          dragElastic={0}
          onDragEnd={handleDragEnd}
          style={{ x: dragX, y: dragY, scale: cardScale }}
          className={cn(
            'pointer-events-auto relative z-10 w-full max-w-md min-h-0',
            size === 'sheet' ? 'h-full max-h-full' : 'h-auto max-h-full',
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
              'relative bg-background rounded-3xl shadow-soft-lg flex flex-col overflow-hidden min-h-0 w-full',
              size === 'sheet' ? 'h-full max-h-full' : 'h-auto max-h-full',
              className,
            )}
          >
            {onExit && (
              <button
                type="button"
                onClick={onExit}
                className="absolute top-3 right-3 z-20 w-11 h-11 flex items-center justify-center rounded-full bg-muted/90 text-muted-foreground"
                aria-label="Lukk"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}
            {children}
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default CenteredPopup;
