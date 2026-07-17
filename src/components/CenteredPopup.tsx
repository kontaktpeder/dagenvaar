import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CenteredPopupProps {
  onClose: () => void;
  children: ReactNode;
  /** Shared shell — one size for day/detail/create/edit/profile so stacking feels solid */
  size?: 'sheet';
  className?: string;
  /** Higher z when stacked over another popup */
  zClassName?: string;
}

/** One composition size for all centered modals */
export const POPUP_SHELL =
  'max-w-md w-full h-[min(82dvh,680px)] max-h-[calc(100%-5rem)]';

/**
 * Fixed centered card. Shell does not move with the keyboard —
 * sticky footers inside should use PopupStickyFooter for that.
 * Generous outer padding so backdrop dismiss stays easy to hit.
 */
const CenteredPopup = ({
  onClose,
  children,
  size: _size = 'sheet',
  className,
  zClassName = 'z-50',
}: CenteredPopupProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'fixed inset-0 flex items-center justify-center px-5 py-10',
        zClassName,
      )}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-foreground/25" aria-hidden />

      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className={cn(
          'relative z-10 bg-background rounded-3xl shadow-soft-lg flex flex-col overflow-hidden',
          POPUP_SHELL,
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
