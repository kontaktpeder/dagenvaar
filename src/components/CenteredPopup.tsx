import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CenteredPopupProps {
  onClose: () => void;
  children: ReactNode;
  /** card ≈ day preview; tall ≈ create/edit wizards */
  size?: 'card' | 'tall';
  className?: string;
  /** Higher z when stacked over another popup */
  zClassName?: string;
}

const sizeClass = {
  card: 'max-w-sm h-[min(85dvh,640px)] max-h-[calc(100%-2rem)]',
  tall: 'max-w-md h-[min(92dvh,760px)] max-h-[calc(100%-2rem)]',
} as const;

/**
 * Fixed centered card. Shell does not move with the keyboard —
 * sticky footers inside should use PopupStickyFooter for that.
 */
const CenteredPopup = ({
  onClose,
  children,
  size = 'card',
  className,
  zClassName = 'z-50',
}: CenteredPopupProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn('fixed inset-0 flex items-center justify-center px-4', zClassName)}
    >
      <div className="absolute inset-0 bg-foreground/25" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className={cn(
          'relative z-10 w-full bg-background rounded-3xl shadow-soft-lg flex flex-col overflow-hidden',
          sizeClass[size],
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
