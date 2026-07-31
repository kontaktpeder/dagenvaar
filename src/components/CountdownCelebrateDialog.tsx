import { useEffect } from 'react';
import { CountdownModalShell } from '@/components/CountdownModalShell';
import { CountdownDigits } from '@/components/CountdownDigits';
import { burstConfetti } from '@/lib/celebrate';
import { getCountdownTheme } from '@/lib/countdownThemes';
import { useLocale } from '@/hooks/useLocale';

interface CountdownCelebrateDialogProps {
  title: string;
  body: string;
  emoji?: string | null;
  themeId?: string | null;
  targetAt?: string | null;
  onClose: () => void;
}

/** Full celebration card — confetti + welcome layout (not a toast). */
const CountdownCelebrateDialog = ({
  title,
  body,
  emoji,
  themeId,
  targetAt,
  onClose,
}: CountdownCelebrateDialogProps) => {
  const { t } = useLocale();
  const theme = getCountdownTheme(themeId);

  useEffect(() => {
    const id = window.setTimeout(
      () => burstConfetti({ colors: theme.confetti, count: 56 }),
      100,
    );
    return () => window.clearTimeout(id);
  }, [theme.confetti]);

  return (
    <CountdownModalShell onClose={onClose} labelledBy="countdown-celebrate-title">
      <p className="text-4xl mb-3" aria-hidden>
        {emoji || '✨'}
      </p>
      <h2 id="countdown-celebrate-title" className="text-2xl font-bold tracking-tight mb-2">
        {title}
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed mb-5">{body}</p>

      {targetAt ? (
        <div className="mb-5">
          <CountdownDigits
            targetAt={targetAt}
            themeId={themeId}
            compact
          />
        </div>
      ) : null}

      <button
        type="button"
        onClick={onClose}
        className="w-full rounded-2xl bg-green-200 text-green-900 py-3.5 font-semibold hover:bg-green-300 transition-colors"
      >
        {t('welcome.cta')}
      </button>
    </CountdownModalShell>
  );
};

export default CountdownCelebrateDialog;
