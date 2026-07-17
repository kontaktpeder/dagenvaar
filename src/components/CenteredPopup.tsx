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
 * Fixed centered card. Keyboard lifts the shell via overlay padding —
 * sheet height stays fixed so content does not violently collapse.
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
              paddingBottom: Math.min(keyboardInset + 8, window.innerHeight * 0.42),
              paddingTop: 16,
              transition: 'padding-bottom 160ms ease-out',
            }
          : undefined
      }
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-foreground/40" aria-hidden />

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ type: 'spring', damping: 32, stiffness: 380 }}
        className={cn(
          'relative z-10 bg-background rounded-3xl shadow-soft-lg flex flex-col overflow-hidden min-h-0',
          sizeClass[size],
          className,
        )}
        style={
          keyboardOpen
            ? {
                // Cap height to space above keyboard — keep sheet tall, never collapse to content
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
