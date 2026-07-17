import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';

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
 * Fixed centered card. When the keyboard opens the whole shell lifts above it
 * (overlay padding) so short hug modals stay usable. Sticky footers only need
 * safe-area padding — see PopupStickyFooter.
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'fixed inset-0 flex justify-center px-5',
        keyboardOpen ? 'items-end' : 'items-center py-10',
        zClassName,
      )}
      style={
        keyboardOpen
          ? {
              paddingBottom: keyboardInset + 10,
              paddingTop: 20,
              transition: 'padding-bottom 160ms ease-out',
            }
          : undefined
      }
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-foreground/25" aria-hidden />

      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className={cn(
          'relative z-10 bg-background rounded-3xl shadow-soft-lg flex flex-col overflow-hidden min-h-0',
          sizeClass[size],
          keyboardOpen && size === 'sheet' && 'max-h-[calc(100%-0.5rem)] h-auto',
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

export default CenteredPopup;
