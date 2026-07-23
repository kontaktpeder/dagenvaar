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
