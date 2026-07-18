import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';
import { fadeQuick, sheetCardVariants, sheetSpring, KEYBOARD_PAD_TRANSITION } from '@/lib/motion';

interface CenteredPopupProps {
  onClose: () => void;
  children: ReactNode;
  /**
   * hug — shrinks to content (day preview, event detail)
   * sheet — fixed tall shell (create/edit/profile/list)
   */
  size?: 'hug' | 'sheet';
  className?: string;
  /** Higher z when stacked over another popup */
  zClassName?: string;
  /**
   * solid — backdrop fully on from first frame (default; no enter blink)
   * none — no dim (rare; e.g. nested where parent already dims)
   */
  backdrop?: 'solid' | 'none';
}

const sizeClass = {
  hug: 'max-w-md w-full h-auto max-h-[min(82dvh,680px)]',
  sheet: 'max-w-md w-full h-[min(82dvh,680px)] max-h-[calc(100%-5rem)]',
} as const;

/**
 * Fixed centered card.
 * Backdrop is solid on enter (fade only on exit) so open never blinks.
 * Card slides a few px without opacity change.
 */
const CenteredPopup = ({
  onClose,
  children,
  size = 'sheet',
  className,
  zClassName = 'z-50',
  backdrop = 'solid',
}: CenteredPopupProps) => {
  const keyboardInset = useKeyboardInset();
  const keyboardOpen = keyboardInset > 24;
  const bottomPad = keyboardOpen
    ? Math.min(keyboardInset + 8, typeof window !== 'undefined' ? window.innerHeight * 0.42 : keyboardInset)
    : 40;

  const [padReady, setPadReady] = useState(false);
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setPadReady(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={fadeQuick}
      className={cn('fixed inset-0 flex items-center justify-center px-5 py-10', zClassName)}
      style={{
        paddingBottom: bottomPad,
        transition: padReady ? KEYBOARD_PAD_TRANSITION : undefined,
      }}
      onClick={onClose}
    >
      {backdrop !== 'none' && (
        <div className="absolute inset-0 bg-foreground/40" aria-hidden />
      )}

      <motion.div
        variants={sheetCardVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={sheetSpring}
        className={cn(
          'relative z-10 bg-background rounded-3xl shadow-soft-lg flex flex-col overflow-hidden min-h-0',
          sizeClass[size],
          className,
        )}
        style={
          keyboardOpen
            ? {
                height: size === 'sheet' ? `min(82dvh, calc(100dvh - ${keyboardInset + 36}px))` : undefined,
                maxHeight: `calc(100dvh - ${keyboardInset + 36}px)`,
              }
            : undefined
        }
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

export default CenteredPopup;
