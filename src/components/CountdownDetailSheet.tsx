import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  useRespondToCountdown,
  useInviteToCountdown,
  useCancelCountdown,
  myParticipant,
  type CountdownWithParticipants,
} from '@/hooks/useCountdowns';
import { getCountdownTheme } from '@/lib/countdownThemes';
import { getCountdownRemaining } from '@/lib/countdownTime';
import { burstConfetti } from '@/lib/celebrate';
import type { HouseholdMember } from '@/hooks/useHousehold';
import { useLocale } from '@/hooks/useLocale';
import { getMemberColor } from '@/lib/colors';
import CenteredPopup from '@/components/CenteredPopup';
import PopupStickyFooter from '@/components/PopupStickyFooter';

interface CountdownDetailSheetProps {
  countdown: CountdownWithParticipants;
  members: HouseholdMember[];
  currentMemberId: string;
  onClose: () => void;
}

const CountdownDetailSheet = ({
  countdown,
  members,
  currentMemberId,
  onClose,
}: CountdownDetailSheetProps) => {
  const { t, dateLocale } = useLocale();
  const theme = getCountdownTheme(countdown.theme);
  const respond = useRespondToCountdown();
  const invite = useInviteToCountdown();
  const cancel = useCancelCountdown();
  const [remaining, setRemaining] = useState(() => getCountdownRemaining(countdown.target_at));
  const [celebrated, setCelebrated] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  const mine = myParticipant(countdown, currentMemberId);
  const isCreator = countdown.created_by_member_id === currentMemberId;
  const isJoined = mine?.status === 'joined';
  const isInvited = mine?.status === 'invited';

  useEffect(() => {
    const tick = () => setRemaining(getCountdownRemaining(countdown.target_at));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [countdown.target_at]);

  useEffect(() => {
    if (remaining.isZero && isJoined && !celebrated) {
      setCelebrated(true);
      burstConfetti({ colors: theme.confetti, count: 64 });
    }
  }, [remaining.isZero, isJoined, celebrated, theme.confetti]);

  const getMember = (id: string) => members.find((m) => m.id === id);
  const creator = getMember(countdown.created_by_member_id);

  const handleAccept = async () => {
    try {
      await respond.mutateAsync({
        countdownId: countdown.id,
        accept: true,
        householdId: countdown.household_id,
        title: countdown.title,
        targetAt: countdown.target_at,
        creatorUserId: creator?.user_id,
      });
      burstConfetti({ colors: theme.confetti, count: 48 });
      toast.success(t('countdown.joined'));
    } catch (err: any) {
      toast.error(err?.message ?? t('common.error'));
    }
  };

  const handleDecline = async () => {
    try {
      await respond.mutateAsync({
        countdownId: countdown.id,
        accept: false,
        householdId: countdown.household_id,
        title: countdown.title,
        targetAt: countdown.target_at,
      });
      toast.success(t('countdown.declined'));
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? t('common.error'));
    }
  };

  const handleCancel = async () => {
    if (!window.confirm(t('countdown.cancelConfirm'))) return;
    try {
      await cancel.mutateAsync(countdown.id);
      toast.success(t('countdown.cancelled'));
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? t('common.error'));
    }
  };

  const inviteable = members.filter((m) => {
    if (m.id === currentMemberId) return false;
    const p = countdown.countdown_participants.find((x) => x.member_id === m.id);
    return !p || p.status === 'declined';
  });

  const handleInvite = async (memberId: string) => {
    const m = getMember(memberId);
    if (!m) return;
    try {
      await invite.mutateAsync({
        countdownId: countdown.id,
        memberIds: [memberId],
        householdId: countdown.household_id,
        title: countdown.title,
        targetAt: countdown.target_at,
        inviteUserIds: m.user_id ? [m.user_id] : [],
      });
      toast.success(t('countdown.inviteSent'));
      setShowInvite(false);
    } catch (err: any) {
      toast.error(err?.message ?? t('common.error'));
    }
  };

  const target = new Date(countdown.target_at);
  const bigNumber = remaining.isPast
    ? '🎉'
    : remaining.days > 0
      ? String(remaining.days)
      : remaining.hours > 0
        ? String(remaining.hours)
        : String(remaining.minutes);

  const bigLabel = remaining.isPast
    ? t('countdown.itsTime')
    : remaining.days > 0
      ? remaining.days === 1
        ? t('countdown.dayLeft')
        : t('countdown.daysLeft')
      : remaining.hours > 0
        ? t('countdown.hoursLeft')
        : t('countdown.minutesLeft');

  return (
    <CenteredPopup onClose={onClose} onExit={onClose} size="sheet" detents={['half', 'full']} initialDetent="full" zClassName="z-[60]">
      <div
        className="mx-5 mt-1 mb-4 rounded-3xl px-5 py-8 text-center relative overflow-hidden"
        style={{ background: theme.gradient }}
      >
        <motion.div
          key={bigNumber}
          initial={{ scale: 0.85, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 22 }}
        >
          <p className="text-6xl font-display font-bold text-foreground/90 leading-none tracking-tight">
            {countdown.emoji ? (
              <span className="block text-4xl mb-2">{countdown.emoji}</span>
            ) : null}
            {bigNumber}
          </p>
          <p className={`mt-2 text-sm font-semibold ${theme.accentText}`}>{bigLabel}</p>
        </motion.div>
        <h2 className="mt-4 text-xl font-display font-bold text-foreground">{countdown.title}</h2>
        <p className="text-sm text-foreground/70 mt-1 capitalize">
          {format(target, 'EEEE d. MMMM · HH:mm', { locale: dateLocale })}
        </p>
        {!remaining.isPast && remaining.days === 0 && (
          <p className="text-xs text-foreground/60 mt-2 font-medium tabular-nums">
            {String(remaining.hours).padStart(2, '0')}:
            {String(remaining.minutes).padStart(2, '0')}:
            {String(remaining.seconds).padStart(2, '0')}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-4 min-h-0" data-sheet-scroll>
        <div>
          <p className="text-sm font-semibold mb-2">{t('countdown.participants')}</p>
          <div className="space-y-2">
            {countdown.countdown_participants
              .filter((p) => p.status !== 'declined')
              .map((p) => {
                const m = getMember(p.member_id);
                if (!m) return null;
                const color = getMemberColor(m.color_token);
                return (
                  <div key={p.id} className={`flex items-center gap-3 rounded-xl p-3 ${color.bg}`}>
                    <span className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center font-bold text-sm shrink-0 bg-white/50">
                      {m.avatar_url ? (
                        <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        m.display_name.charAt(0)
                      )}
                    </span>
                    <span className="font-medium flex-1 text-sm">{m.display_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {p.status === 'joined'
                        ? t('countdown.statusJoined')
                        : t('countdown.statusInvited')}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        {isJoined && inviteable.length > 0 && (
          <div>
            {!showInvite ? (
              <button
                type="button"
                onClick={() => setShowInvite(true)}
                className="text-sm font-semibold text-foreground underline-offset-2 hover:underline"
              >
                {t('countdown.inviteMore')}
              </button>
            ) : (
              <div className="space-y-2">
                {inviteable.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => void handleInvite(m.id)}
                    className="w-full rounded-xl bg-muted px-4 py-3 text-left text-sm font-medium"
                  >
                    {t('countdown.invitePerson', { name: m.display_name })}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {isCreator && countdown.status === 'active' && (
          <button
            type="button"
            onClick={() => void handleCancel()}
            className="text-sm text-destructive font-medium"
          >
            {t('countdown.cancel')}
          </button>
        )}
      </div>

      {isInvited && (
        <PopupStickyFooter className="space-y-2">
          <button
            type="button"
            disabled={respond.isPending}
            onClick={() => void handleAccept()}
            className="w-full rounded-2xl bg-green-200 text-green-900 py-3.5 font-semibold"
          >
            {t('countdown.join')}
          </button>
          <button
            type="button"
            disabled={respond.isPending}
            onClick={() => void handleDecline()}
            className="w-full rounded-2xl bg-muted text-foreground py-3.5 font-semibold"
          >
            {t('countdown.decline')}
          </button>
        </PopupStickyFooter>
      )}
    </CenteredPopup>
  );
};

export default CountdownDetailSheet;
