import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';

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
  card: 'max-w-sm',
  tall: 'max-w-md',
} as const;

const sizeHeight = {
  card: 'min(85dvh, 640px)',
  tall: 'min(92dvh, 760px)',
} as const;

const CenteredPopup = ({
  onClose,
  children,
  size = 'card',
  className,
  zClassName = 'z-50',
}: CenteredPopupProps) => {
  const keyboardInset = useKeyboardInset();
  const keyboardOpen = keyboardInset > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'fixed inset-0 flex justify-center px-4',
        keyboardOpen ? 'items-end' : 'items-center',
        zClassName,
      )}
      style={{
        paddingBottom: keyboardOpen ? keyboardInset : undefined,
        transition: 'padding-bottom 180ms ease-out',
      }}
    >
      <div className="absolute inset-0 bg-foreground/25" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className={cn(
          'relative z-10 w-full bg-background rounded-3xl shadow-soft-lg flex flex-col overflow-hidden my-2',
          sizeClass[size],
          className,
        )}
        style={{
          height: sizeHeight[size],
          maxHeight: keyboardOpen
            ? `calc(100% - 0.5rem)`
            : `min(${sizeHeight[size]}, calc(100% - 2rem))`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

export default CenteredPopup;
