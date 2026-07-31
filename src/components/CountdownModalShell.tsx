import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useLocale } from '@/hooks/useLocale';

/** Welcome-style centered card — hugs content, soft backdrop. */
export function CountdownModalShell({
  children,
  onClose,
  labelledBy,
  zClassName = 'z-[90]',
}: {
  children: ReactNode;
  onClose: () => void;
  labelledBy?: string;
  zClassName?: string;
}) {
  const { t } = useLocale();

  return (
    <motion.div
      className={`fixed inset-0 ${zClassName} flex items-center justify-center px-6`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <button
        type="button"
        aria-label={t('common.close')}
        className="absolute inset-0 bg-foreground/40"
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: 'tween', duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
        className="relative w-full max-w-sm max-h-[min(85dvh,40rem)] overflow-y-auto overscroll-contain rounded-[1.75rem] bg-background p-6 pt-7 text-center shadow-soft-lg"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
