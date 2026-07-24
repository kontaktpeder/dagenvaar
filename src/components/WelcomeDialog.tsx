import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocale } from '@/hooks/useLocale';
import { burstConfetti } from '@/lib/celebrate';
import type { WelcomeIntent } from '@/lib/welcomeIntent';

interface WelcomeDialogProps {
  intent: WelcomeIntent;
  onClose: () => void;
}

/** Centered welcome after onboarding / seed — not a toast. */
const WelcomeDialog = ({ intent, onClose }: WelcomeDialogProps) => {
  const { t } = useLocale();

  useEffect(() => {
    const id = window.setTimeout(() => burstConfetti(), 120);
    return () => window.clearTimeout(id);
  }, []);

  const title = intent === 'join' ? t('welcome.joinTitle') : t('welcome.createTitle');
  const body = intent === 'join' ? t('welcome.joinBody') : t('welcome.createBody');

  return (
    <motion.div
      className="fixed inset-0 z-[90] flex items-center justify-center px-6"
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
        aria-labelledby="welcome-title"
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: 'tween', duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
        className="relative w-full max-w-sm rounded-[1.75rem] bg-background p-6 pt-7 text-center shadow-soft-lg"
      >
        <p className="text-4xl mb-3" aria-hidden>
          {intent === 'join' ? '👋' : '✨'}
        </p>
        <h2 id="welcome-title" className="text-2xl font-bold tracking-tight mb-2">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">{body}</p>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-2xl bg-green-200 text-green-900 py-3.5 font-semibold hover:bg-green-300 transition-colors"
        >
          {t('welcome.cta')}
        </button>
      </motion.div>
    </motion.div>
  );
};

export default WelcomeDialog;
