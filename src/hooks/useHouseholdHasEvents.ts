import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** True when the household has at least one event (any date). */
export function useHouseholdHasEvents(householdId: string | undefined) {
  return useQuery({
    queryKey: ['household-has-events', householdId],
    enabled: !!householdId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id')
        .eq('household_id', householdId!)
        .limit(1);
      if (error) throw error;
      return (data?.length ?? 0) > 0;
    },
  });
}
