import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useMemberEventLeak(eventId: string | undefined, memberId: string | undefined) {
  return useQuery({
    queryKey: ['member-event-leak', eventId, memberId],
    enabled: !!eventId && !!memberId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('member_leak_events')
        .select('event_id')
        .eq('event_id', eventId!)
        .eq('member_id', memberId!)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
}

export function useSetMemberEventLeak() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, leak }: { eventId: string; leak: boolean }) => {
      const { error } = await supabase.rpc('set_member_event_leak', {
        p_event_id: eventId,
        p_leak: leak,
      });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['member-event-leak', vars.eventId] });
      queryClient.invalidateQueries({ queryKey: ['overlay-events'] });
    },
  });
}
