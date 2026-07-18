import type { ReactNode } from 'react';
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
}

const sizeClass = {
  hug: 'max-w-md w-full h-auto max-h-[min(82dvh,680px)]',
  sheet: 'max-w-md w-full h-[min(82dvh,680px)] max-h-[calc(100%-5rem)]',
} as const;

/**
 * Fixed centered card. Keyboard lifts via bottom padding (keeps items-center —
 * no flex-alignment jump). Sheet height stays fixed so content does not collapse.
 */
const CenteredPopup = ({
  onClose,
  children,
  size = 'sheet',
  className,
  zClassName = 'z-50',
}: CenteredPopupProps) => {
  const keyboardInset = useKeyboardInset();
  const keyboardOpen = keyboardInset > 24;
  const bottomPad = keyboardOpen
    ? Math.min(keyboardInset + 8, typeof window !== 'undefined' ? window.innerHeight * 0.42 : keyboardInset)
    : 40;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={fadeQuick}
      className={cn('fixed inset-0 flex items-center justify-center px-5 py-10', zClassName)}
      style={{
        paddingBottom: bottomPad,
        transition: KEYBOARD_PAD_TRANSITION,
      }}
      onClick={onClose}
    >
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={fadeQuick}
        className="absolute inset-0 bg-foreground/40"
      />

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
