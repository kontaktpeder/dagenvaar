import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Tables } from '@/integrations/supabase/types';

type Household = Tables<'households'>;
type HouseholdMember = Tables<'household_members'>;

const QUERY_KEY_BASE = 'current-household-context';

export function useCurrentHouseholdContext() {
  const queryClient = useQueryClient();
  const { user: authUser, loading: authLoading } = useAuth();

  const query = useQuery({
    queryKey: [QUERY_KEY_BASE, authUser?.id ?? null],
    queryFn: async () => {
      if (!authUser) return { user: null, household: null as Household | null, currentMember: null as HouseholdMember | null };

      const { data, error } = await supabase
        .from('household_members')
        .select(`
          *,
          household:households (*)
        `)
        .eq('user_id', authUser.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      const membership = data as (HouseholdMember & { household: Household | null }) | null;

      return {
        user: authUser,
        household: membership?.household ?? null,
        currentMember: membership ? { ...membership, household: undefined } as unknown as HouseholdMember : null,
      };
    },
    enabled: !authLoading,
  });

  return {
    user: query.data?.user ?? null,
    household: query.data?.household ?? null,
    currentMember: query.data?.currentMember ?? null,
    loading: authLoading || query.isLoading,
    error: query.error,
    refetch: query.refetch,
    invalidate: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY_BASE] }),
  };
}
