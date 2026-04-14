import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type Event = Tables<'events'>;
export type EventComment = Tables<'event_comments'>;

export function useEventsForMonth(householdId: string | undefined, year: number, month: number) {
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endDate = new Date(year, month + 1, 0);
  const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

  return useQuery({
    queryKey: ['events', householdId, year, month],
    enabled: !!householdId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('household_id', householdId!)
        .gte('event_date', startDate)
        .lte('event_date', endStr)
        .order('event_date')
        .order('day_part');
      if (error) throw error;
      return data;
    },
  });
}

export function useEventsForDate(householdId: string | undefined, date: string) {
  return useQuery({
    queryKey: ['events', householdId, date],
    enabled: !!householdId && !!date,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('household_id', householdId!)
        .eq('event_date', date)
        .order('day_part');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (event: TablesInsert<'events'>) => {
      const { error } = await supabase.from('events').insert(event);
      if (error) throw error;
      return event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase.from('events').delete().eq('id', eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useEventComments(eventId: string | undefined) {
  return useQuery({
    queryKey: ['eventComments', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_comments')
        .select('*')
        .eq('event_id', eventId!)
        .order('created_at');
      if (error) throw error;
      return data;
    },
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (comment: { event_id: string; sender_member_id: string; body: string }) => {
      const { data, error } = await supabase.from('event_comments').insert(comment).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['eventComments', vars.event_id] });
    },
  });
}
