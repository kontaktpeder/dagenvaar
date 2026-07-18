import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
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
   */
  onExit?: () => void;
}

/**
 * Modal shell: safe-area padding is the ONLY margin around the card.
 * Card edges sit flush to that inset — backdrop tap zone = that ring, not a floating gap.
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

  const [padReady, setPadReady] = useState(false);
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setPadReady(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  const framePad = {
    paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
    paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
    paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
    paddingBottom: keyboardOpen
      ? `${Math.min(keyboardInset + 8, typeof window !== 'undefined' ? window.innerHeight * 0.42 : keyboardInset)}px`
      : 'max(0.75rem, env(safe-area-inset-bottom))',
    transition: padReady ? KEYBOARD_PAD_TRANSITION : undefined,
  } as const;

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 1 }}
      transition={{ duration: 0 }}
      className={cn('fixed inset-0', zClassName)}
    >
      {/* Full-screen dismiss target — edge of card = edge of hit-test for “outside” */}
      <div
        className={cn('absolute inset-0', backdrop === 'solid' ? 'bg-foreground/40' : 'bg-transparent')}
        onClick={onClose}
        aria-hidden
      />

      {/* Safe frame: insets hug the card; card fills the frame */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={framePad}
      >
        <motion.div
          variants={sheetCardVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={sheetSpring}
          className={cn(
            'pointer-events-auto relative z-10 bg-background rounded-3xl shadow-soft-lg flex flex-col overflow-hidden min-h-0 w-full max-w-md',
            size === 'sheet' ? 'h-full max-h-full' : 'h-auto max-h-full',
            className,
          )}
          onClick={(e) => e.stopPropagation()}
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
      </div>
    </motion.div>
  );
};

export default CenteredPopup;
