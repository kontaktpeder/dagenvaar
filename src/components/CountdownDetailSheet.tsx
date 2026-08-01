import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  useRespondToCountdown,
  useInviteToCountdown,
  useCancelCountdown,
  myParticipant,
  type CountdownWithParticipants,
} from '@/hooks/useCountdowns';
import { getMemberColor } from '@/lib/colors';
import type { HouseholdMember } from '@/hooks/useHousehold';
import { useLocale } from '@/hooks/useLocale';
import CenteredPopup from '@/components/CenteredPopup';
import PopupStickyFooter from '@/components/PopupStickyFooter';
import { CountdownDigits } from '@/components/CountdownDigits';
import CountdownCelebrateDialog from '@/components/CountdownCelebrateDialog';

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
  const respond = useRespondToCountdown();
  const invite = useInviteToCountdown();
  const cancel = useCancelCountdown();
  const [showInvite, setShowInvite] = useState(false);
  const [celebrateJoined, setCelebrateJoined] = useState(false);

  const mine = myParticipant(countdown, currentMemberId);
  const isCreator = countdown.created_by_member_id === currentMemberId;
  const isJoined = mine?.status === 'joined' || celebrateJoined;
  const isInvited = mine?.status === 'invited' && !celebrateJoined;

  const getMember = (id: string) => members.find((m) => m.id === id);
  const creator = getMember(countdown.created_by_member_id);
  const target = new Date(countdown.target_at);

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
      setCelebrateJoined(true);
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
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? t('common.error'));
    }
  };

  const handleCancel = async () => {
    if (!window.confirm(t('countdown.cancelConfirm'))) return;
    try {
      await cancel.mutateAsync(countdown.id);
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
      setShowInvite(false);
    } catch (err: any) {
      toast.error(err?.message ?? t('common.error'));
    }
  };

  if (celebrateJoined) {
    return (
      <CountdownCelebrateDialog
        title={t('countdown.joinedTitle')}
        body={t('countdown.joinedBody', { title: countdown.title })}
        emoji={countdown.emoji}
        themeId={countdown.theme}
        targetAt={countdown.target_at}
        onClose={onClose}
      />
    );
  }

  return (
    <CenteredPopup
      onClose={onClose}
      onExit={onClose}
      size="sheet"
      detents={['half', 'full']}
      initialDetent="half"
      zClassName="z-[70]"
    >
      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-touch px-5 pb-4"
        data-sheet-scroll
      >
        <CountdownDigits
          targetAt={countdown.target_at}
          themeId={countdown.theme}
          emoji={countdown.emoji}
          title={countdown.title}
        />

        <p id="countdown-detail-title" className="sr-only">
          {countdown.title}
        </p>

        <p className="text-sm text-muted-foreground mt-4 capitalize text-center">
          {format(target, 'EEEE d. MMMM · HH:mm', { locale: dateLocale })}
        </p>

        <div className="mt-5 space-y-2 text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center mb-2">
            {t('countdown.participants')}
          </p>
          {countdown.countdown_participants
            .filter((p) => p.status !== 'declined')
            .map((p) => {
              const m = getMember(p.member_id);
              if (!m) return null;
              const color = getMemberColor(m.color_token);
              return (
                <div key={p.id} className={`flex items-center gap-3 rounded-2xl p-3 ${color.bg}`}>
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

        {isJoined && inviteable.length > 0 && (
          <div className="mt-4 space-y-2">
            {!showInvite ? (
              <button
                type="button"
                onClick={() => setShowInvite(true)}
                className="text-sm font-semibold text-foreground underline underline-offset-2"
              >
                {t('countdown.inviteMore')}
              </button>
            ) : (
              inviteable.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => void handleInvite(m.id)}
                  className="w-full rounded-2xl bg-muted px-4 py-3 text-sm font-medium"
                >
                  {t('countdown.invitePerson', { name: m.display_name })}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <PopupStickyFooter>
        {isInvited ? (
          <>
            <button
              type="button"
              disabled={respond.isPending}
              onClick={() => void handleAccept()}
              className="w-full rounded-2xl bg-green-200 text-green-900 py-3.5 font-semibold hover:bg-green-300 transition-colors"
            >
              {t('countdown.join')}
            </button>
            <button
              type="button"
              disabled={respond.isPending}
              onClick={() => void handleDecline()}
              className="w-full rounded-2xl bg-muted text-foreground py-3 font-semibold"
            >
              {t('countdown.decline')}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl bg-green-200 text-green-900 py-3.5 font-semibold hover:bg-green-300 transition-colors"
          >
            {t('welcome.cta')}
          </button>
        )}

        {isCreator && countdown.status === 'active' && (
          <button
            type="button"
            onClick={() => void handleCancel()}
            className="w-full py-2 text-sm font-medium text-destructive"
          >
            {t('countdown.cancel')}
          </button>
        )}
      </PopupStickyFooter>
    </CenteredPopup>
  );
};

export default CountdownDetailSheet;
