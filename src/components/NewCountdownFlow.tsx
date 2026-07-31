import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useCreateCountdown } from '@/hooks/useCountdowns';
import { COUNTDOWN_THEME_IDS, getCountdownTheme, type CountdownThemeId } from '@/lib/countdownThemes';
import { localDateAndTimeToIso } from '@/lib/countdownTime';
import { burstConfetti } from '@/lib/celebrate';
import type { HouseholdMember } from '@/hooks/useHousehold';
import { useLocale } from '@/hooks/useLocale';
import { getMemberColor } from '@/lib/colors';
import CenteredPopup from '@/components/CenteredPopup';
import PopupStickyFooter from '@/components/PopupStickyFooter';
import { stepForward, stepSpring } from '@/lib/motion';

const FIELD =
  'min-w-0 box-border appearance-none rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary w-full';

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
    // Pre-select sole partner for convenience, but they still must accept
    return others.length === 1 ? [others[0].id] : [];
  });

  const others = members.filter((m) => m.id !== currentMemberId);
  const themeMeta = getCountdownTheme(theme);

  const handleDismiss = () => {
    if (step > 1) setStep((s) => s - 1);
    else onClose();
  };

  const canProceed =
    step === 1 ? title.trim().length > 0 :
    step === 2 ? true :
    step === 3 ? true :
    true;

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

      burstConfetti({ colors: themeMeta.confetti, count: 48 });
      toast.success(t('countdown.created'));
      onCreated?.(created.id);
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? t('common.error'));
    }
  };

  return (
    <CenteredPopup onClose={handleDismiss} onExit={onClose} size="sheet" zClassName="z-[60]">
      <div className="px-5 pt-1 pb-2 shrink-0">
        <p className="text-xs font-medium text-muted-foreground mb-1">
          {t('countdown.step', { n: String(step), total: String(STEPS) })}
        </p>
        <h2 className="text-xl font-display font-bold">
          {step === 1 && t('countdown.what')}
          {step === 2 && t('countdown.when')}
          {step === 3 && t('countdown.theme')}
          {step === 4 && t('countdown.who')}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {step === 1 && t('countdown.whatHint')}
          {step === 2 && t('countdown.whenHint')}
          {step === 3 && t('countdown.themeHint')}
          {step === 4 && t('countdown.whoHint')}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-3 min-h-0" data-sheet-scroll>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={stepForward.initial}
            animate={stepForward.animate}
            exit={stepForward.exit}
            transition={stepSpring}
            className="space-y-4"
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
                <div>
                  <p className="text-sm font-medium mb-2">{t('countdown.emoji')}</p>
                  <div className="flex flex-wrap gap-2">
                    {EMOJI_SUGGESTIONS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => setEmoji(e)}
                        className={`w-11 h-11 rounded-xl text-xl flex items-center justify-center transition-colors ${
                          emoji === e ? 'bg-primary text-primary-foreground ring-2 ring-primary/40' : 'bg-muted'
                        }`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <label className="block">
                  <span className="text-sm font-medium mb-1.5 block">{t('event.date')}</span>
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
                  <span className="text-sm font-medium mb-1.5 block">{t('event.clock')}</span>
                  <input
                    type="time"
                    className={FIELD}
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </label>
                <p className="text-sm text-muted-foreground">
                  {format(date, 'EEEE d. MMMM', { locale: dateLocale })} · {time}
                </p>
              </div>
            )}

            {step === 3 && (
              <div className="grid grid-cols-2 gap-3">
                {COUNTDOWN_THEME_IDS.map((id) => {
                  const meta = getCountdownTheme(id);
                  const selected = theme === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTheme(id)}
                      className={`rounded-2xl p-4 text-left transition-shadow ${
                        selected ? 'ring-2 ring-foreground/30 shadow-soft' : ''
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
                  <p className="text-sm text-muted-foreground py-6 text-center">
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
                        className={`w-full flex items-center gap-3 rounded-xl p-3 text-left transition-colors ${
                          selected ? `${color.bg} ring-2 ring-foreground/15` : 'bg-muted'
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
                        <span className="font-semibold flex-1">{m.display_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {selected ? t('countdown.willInvite') : t('countdown.tapToInvite')}
                        </span>
                      </button>
                    );
                  })
                )}
                <p className="text-xs text-muted-foreground pt-2">{t('countdown.inviteNote')}</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <PopupStickyFooter>
        {step < STEPS ? (
          <button
            type="button"
            disabled={!canProceed}
            onClick={() => setStep((s) => s + 1)}
            className="w-full rounded-2xl bg-green-200 text-green-900 py-3.5 font-semibold disabled:opacity-40"
          >
            {t('common.next')}
          </button>
        ) : (
          <button
            type="button"
            disabled={createCountdown.isPending}
            onClick={() => void handleCreate()}
            className="w-full rounded-2xl bg-green-200 text-green-900 py-3.5 font-semibold disabled:opacity-40"
          >
            {createCountdown.isPending ? t('event.saving') : t('countdown.create')}
          </button>
        )}
      </PopupStickyFooter>
    </CenteredPopup>
  );
};

export default NewCountdownFlow;
