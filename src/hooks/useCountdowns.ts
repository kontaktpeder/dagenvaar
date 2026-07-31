import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { notifyPartners } from '@/lib/notifyPartners';
import { targetDateStr } from '@/lib/countdownTime';
import type { Tables } from '@/integrations/supabase/types';

export type Countdown = Tables<'countdowns'>;
export type CountdownParticipant = Tables<'countdown_participants'>;

export type CountdownWithParticipants = Countdown & {
  countdown_participants: CountdownParticipant[];
};

function invalidateCountdowns(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['countdowns'] });
}

export function useCountdowns(householdId: string | undefined) {
  return useQuery({
    queryKey: ['countdowns', householdId],
    enabled: !!householdId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('countdowns')
        .select('*, countdown_participants(*)')
        .eq('household_id', householdId!)
        .in('status', ['active', 'done'])
        .order('target_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as CountdownWithParticipants[];
    },
  });
}

export function useActiveCountdowns(householdId: string | undefined) {
  const q = useCountdowns(householdId);
  return {
    ...q,
    data: (q.data ?? []).filter((c) => c.status === 'active'),
  };
}

export type CreateCountdownInput = {
  household_id: string;
  title: string;
  target_at: string;
  theme?: string;
  emoji?: string | null;
  invite_member_ids?: string[];
  /** For push: user_ids of invitees */
  invite_user_ids?: string[];
};

export function useCreateCountdown() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCountdownInput) => {
      const { data, error } = await supabase.rpc('create_countdown', {
        p_household_id: input.household_id,
        p_title: input.title,
        p_target_at: input.target_at,
        p_theme: input.theme ?? 'rose',
        p_emoji: input.emoji ?? null,
        p_invite_member_ids: input.invite_member_ids ?? null,
      });
      if (error) throw error;
      return data as Countdown;
    },
    onSuccess: (created, vars) => {
      invalidateCountdowns(queryClient);
      if (vars.invite_user_ids && vars.invite_user_ids.length > 0) {
        const date = targetDateStr(created.target_at);
        notifyPartners({
          householdId: vars.household_id,
          kind: 'countdown_invite',
          title: 'Nedtelling ✨',
          body: `Du er invitert til «${created.title}» — bli med?`,
          countdownId: created.id,
          targetUserIds: vars.invite_user_ids,
          date,
        });
      }
    },
  });
}

export function useRespondToCountdown() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      countdownId: string;
      accept: boolean;
      householdId: string;
      title: string;
      targetAt: string;
      creatorUserId?: string | null;
    }) => {
      const { data, error } = await supabase.rpc('respond_to_countdown', {
        p_countdown_id: input.countdownId,
        p_accept: input.accept,
      });
      if (error) throw error;
      return data as CountdownParticipant;
    },
    onSuccess: (row, vars) => {
      invalidateCountdowns(queryClient);
      if (vars.accept && vars.creatorUserId) {
        notifyPartners({
          householdId: vars.householdId,
          kind: 'countdown_joined',
          title: 'Nedtelling ✨',
          body: `Noen ble med på «${vars.title}»!`,
          countdownId: vars.countdownId,
          targetUserIds: [vars.creatorUserId],
          date: targetDateStr(vars.targetAt),
        });
      }
    },
  });
}

export function useInviteToCountdown() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      countdownId: string;
      memberIds: string[];
      householdId: string;
      title: string;
      targetAt: string;
      inviteUserIds: string[];
    }) => {
      const { data, error } = await supabase.rpc('invite_to_countdown', {
        p_countdown_id: input.countdownId,
        p_member_ids: input.memberIds,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (_count, vars) => {
      invalidateCountdowns(queryClient);
      if (vars.inviteUserIds.length > 0) {
        notifyPartners({
          householdId: vars.householdId,
          kind: 'countdown_invite',
          title: 'Nedtelling ✨',
          body: `Du er invitert til «${vars.title}» — bli med?`,
          countdownId: vars.countdownId,
          targetUserIds: vars.inviteUserIds,
          date: targetDateStr(vars.targetAt),
        });
      }
    },
  });
}

export function useCancelCountdown() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (countdownId: string) => {
      const { data, error } = await supabase.rpc('cancel_countdown', {
        p_countdown_id: countdownId,
      });
      if (error) throw error;
      return data as Countdown;
    },
    onSuccess: () => invalidateCountdowns(queryClient),
  });
}

export function myParticipant(
  countdown: CountdownWithParticipants,
  memberId: string,
): CountdownParticipant | undefined {
  return countdown.countdown_participants?.find((p) => p.member_id === memberId);
}
