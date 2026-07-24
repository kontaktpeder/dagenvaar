import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useLocale } from '@/hooks/useLocale';
import { consumeWelcomeIntent } from '@/lib/welcomeIntent';
import { burstConfetti } from '@/lib/celebrate';

/** One-shot welcome after create/join onboarding. */
const WelcomeHost = () => {
  const { t } = useLocale();
  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current) return;
    const intent = consumeWelcomeIntent();
    if (!intent) return;
    shownRef.current = true;

    window.setTimeout(() => {
      burstConfetti();
      if (intent === 'join') {
        toast.success(t('welcome.joinTitle'), {
          description: t('welcome.joinBody'),
          duration: 6500,
        });
      } else {
        toast.success(t('welcome.createTitle'), {
          description: t('welcome.createBody'),
          duration: 6500,
        });
      }
    }, 450);
  }, [t]);

  return null;
};

export default WelcomeHost;
