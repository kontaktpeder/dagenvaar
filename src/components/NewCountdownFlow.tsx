import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useCreateCountdown } from '@/hooks/useCountdowns';
import { COUNTDOWN_THEME_IDS, getCountdownTheme, type CountdownThemeId } from '@/lib/countdownThemes';
import { localDateAndTimeToIso } from '@/lib/countdownTime';
import type { HouseholdMember } from '@/hooks/useHousehold';
import { useLocale } from '@/hooks/useLocale';
import { getMemberColor } from '@/lib/colors';
import { CountdownModalShell } from '@/components/CountdownModalShell';
import CountdownCelebrateDialog from '@/components/CountdownCelebrateDialog';
import { stepForward, stepSpring } from '@/lib/motion';

const FIELD =
  'min-w-0 box-border appearance-none rounded-xl border border-border bg-muted/50 px-4 py-3 text-base text-center focus:outline-none focus:ring-2 focus:ring-primary w-full';

const EMOJI_SUGGESTIONS = ['✨', '❤️', '🌴', '✈️', '🕯️', '🎉', '🏖️', '🍷'];

interface NewCountdownFlowProps {
  householdId: string;
  members: HouseholdMember[];
  currentMemberId: string;
  initialDate?: Date;
  onClose: () => void;
  onCreated?: (countdownId: string) => void;
}

const STEPS = 4;

const NewCountdownFlow = ({
  householdId,
  members,
  currentMemberId,
  initialDate,
  onClose,
  onCreated,
}: NewCountdownFlowProps) => {
  const { t, locale, dateLocale } = useLocale();
  const createCountdown = useCreateCountdown();
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('✨');
  const [date, setDate] = useState(initialDate || new Date());
  const [time, setTime] = useState('18:00');
  const [theme, setTheme] = useState<CountdownThemeId>('rose');
  const [inviteIds, setInviteIds] = useState<string[]>(() => {
    const others = members.filter((m) => m.id !== currentMemberId);
    return others.length === 1 ? [others[0].id] : [];
  });
  const [celebrate, setCelebrate] = useState<{
    id: string;
    title: string;
    targetAt: string;
    theme: string;
    emoji: string | null;
  } | null>(null);

  const others = members.filter((m) => m.id !== currentMemberId);

  const handleDismiss = () => {
    if (celebrate) {
      onClose();
      return;
    }
    if (step > 1) setStep((s) => s - 1);
    else onClose();
  };

  const canProceed = step === 1 ? title.trim().length > 0 : true;

  const toggleInvite = (id: string) => {
    setInviteIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleCreate = async () => {
    const targetAt = localDateAndTimeToIso(date, time);
    if (new Date(targetAt).getTime() <= Date.now()) {
      toast.error(t('countdown.futureRequired'));
      return;
    }
    try {
      const inviteUserIds = others
        .filter((m) => inviteIds.includes(m.id))
        .map((m) => m.user_id)
        .filter(Boolean);

      const created = await createCountdown.mutateAsync({
        household_id: householdId,
        title: title.trim(),
        target_at: targetAt,
        theme,
        emoji: emoji || null,
        invite_member_ids: inviteIds,
        invite_user_ids: inviteUserIds,
      });

      onCreated?.(created.id);
      setCelebrate({
        id: created.id,
        title: created.title,
        targetAt: created.target_at,
        theme: created.theme,
        emoji: created.emoji,
      });
    } catch (err: any) {
      toast.error(err?.message ?? t('common.error'));
    }
  };

  if (celebrate) {
    return (
      <CountdownCelebrateDialog
        title={t('countdown.createdTitle')}
        body={
          inviteIds.length > 0
            ? t('countdown.createdBodyInvite')
            : t('countdown.createdBodySolo')
        }
        emoji={celebrate.emoji}
        themeId={celebrate.theme}
        targetAt={celebrate.targetAt}
        onClose={onClose}
      />
    );
  }

  const heading =
    step === 1 ? t('countdown.what') :
    step === 2 ? t('countdown.when') :
    step === 3 ? t('countdown.theme') :
    t('countdown.who');

  const hint =
    step === 1 ? t('countdown.whatHint') :
    step === 2 ? t('countdown.whenHint') :
    step === 3 ? t('countdown.themeHint') :
    t('countdown.whoHint');

  return (
    <CountdownModalShell onClose={handleDismiss} labelledBy="countdown-new-title">
      <p className="text-4xl mb-3" aria-hidden>
        {emoji || '✨'}
      </p>
      <p className="text-xs font-medium text-muted-foreground mb-1">
        {t('countdown.step', { n: String(step), total: String(STEPS) })}
      </p>
      <h2 id="countdown-new-title" className="text-2xl font-bold tracking-tight mb-2">
        {heading}
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed mb-5">{hint}</p>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={stepForward.initial}
          animate={stepForward.animate}
          exit={stepForward.exit}
          transition={stepSpring}
          className="space-y-4 text-left"
        >
          {step === 1 && (
            <>
              <input
                className={FIELD}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('countdown.titlePlaceholder')}
                autoFocus
                maxLength={80}
              />
              <div className="flex flex-wrap justify-center gap-2">
                {EMOJI_SUGGESTIONS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    className={`w-11 h-11 rounded-xl text-xl flex items-center justify-center transition-colors ${
                      emoji === e ? 'bg-green-200 ring-2 ring-green-300/60' : 'bg-muted'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-medium mb-1.5 block text-center">{t('event.date')}</span>
                <input
                  type="date"
                  className={FIELD}
                  value={format(date, 'yyyy-MM-dd')}
                  onChange={(e) => {
                    const [y, m, d] = e.target.value.split('-').map(Number);
                    if (y && m && d) setDate(new Date(y, m - 1, d));
                  }}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium mb-1.5 block text-center">{t('event.clock')}</span>
                <input
                  type="time"
                  className={FIELD}
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </label>
              <p className="text-sm text-muted-foreground text-center capitalize">
                {format(date, 'EEEE d. MMMM', { locale: dateLocale })} · {time}
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-2 gap-2.5">
              {COUNTDOWN_THEME_IDS.map((id) => {
                const meta = getCountdownTheme(id);
                const selected = theme === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTheme(id)}
                    className={`rounded-2xl p-4 text-center transition-shadow ${
                      selected ? 'ring-2 ring-foreground/25 shadow-soft' : ''
                    }`}
                    style={{ background: meta.gradient }}
                  >
                    <span className="font-semibold text-sm text-foreground/90">
                      {locale === 'en' ? meta.labelEn : meta.labelNb}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-2">
              {others.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  {t('countdown.noMembers')}
                </p>
              ) : (
                others.map((m) => {
                  const selected = inviteIds.includes(m.id);
                  const color = getMemberColor(m.color_token);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleInvite(m.id)}
                      className={`w-full flex items-center gap-3 rounded-2xl p-3 text-left transition-colors ${
                        selected ? `${color.bg} ring-2 ring-foreground/15` : 'bg-muted/60'
                      }`}
                    >
                      <span
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden shrink-0"
                        style={
                          !m.avatar_url
                            ? { backgroundColor: `hsl(var(--member-${m.color_token.replace('pastel-', '')}))` }
                            : undefined
                        }
                      >
                        {m.avatar_url ? (
                          <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          m.display_name.charAt(0)
                        )}
                      </span>
                      <span className="font-semibold flex-1 text-sm">{m.display_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {selected ? t('countdown.willInvite') : t('countdown.tapToInvite')}
                      </span>
                    </button>
                  );
                })
              )}
              <p className="text-xs text-muted-foreground pt-1 text-center">{t('countdown.inviteNote')}</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 space-y-2">
        {step < STEPS ? (
          <button
            type="button"
            disabled={!canProceed}
            onClick={() => setStep((s) => s + 1)}
            className="w-full rounded-2xl bg-green-200 text-green-900 py-3.5 font-semibold hover:bg-green-300 transition-colors disabled:opacity-40"
          >
            {t('common.next')}
          </button>
        ) : (
          <button
            type="button"
            disabled={createCountdown.isPending}
            onClick={() => void handleCreate()}
            className="w-full rounded-2xl bg-green-200 text-green-900 py-3.5 font-semibold hover:bg-green-300 transition-colors disabled:opacity-40"
          >
            {createCountdown.isPending ? t('event.saving') : t('countdown.create')}
          </button>
        )}
        <button
          type="button"
          onClick={handleDismiss}
          className="w-full py-2 text-sm font-medium text-muted-foreground underline underline-offset-2"
        >
          {step === 1 ? t('common.cancel') : t('common.back')}
        </button>
      </div>
    </CountdownModalShell>
  );
};

export default NewCountdownFlow;
