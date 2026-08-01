import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useHideOverlayEvent(viewerHouseholdId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      if (!viewerHouseholdId) throw new Error('Missing calendar');
      const { error } = await supabase.rpc('hide_overlay_event_for_viewer', {
        p_viewer_household_id: viewerHouseholdId,
        p_event_id: eventId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overlay-events'] });
    },
  });
}

export function useUnhideOverlayEvent(viewerHouseholdId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      if (!viewerHouseholdId) throw new Error('Missing calendar');
      const { error } = await supabase.rpc('unhide_overlay_event_for_viewer', {
        p_viewer_household_id: viewerHouseholdId,
        p_event_id: eventId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overlay-events'] });
    },
  });
}

/** Owner-side: hide/unhide the source event from ALL other calendars. */
export function useSetEventHiddenFromOtherCalendars() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, hidden }: { eventId: string; hidden: boolean }) => {
      const { error } = await supabase
        .from('events')
        .update({ hide_from_other_calendars: hidden })
        .eq('id', eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overlay-events'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
