import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Household = Tables<'households'>;
type HouseholdMember = Tables<'household_members'>;

const QUERY_KEY = ['current-household-context'] as const;

export function useCurrentHouseholdContext() {
  const queryClient = useQueryClient();

  // Invalidate context query whenever auth state changes (sign in/out)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, _session) => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      }
    );
    return () => subscription.unsubscribe();
  }, [queryClient]);

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) return { user: null, household: null as Household | null, currentMember: null as HouseholdMember | null };

      const { data, error } = await supabase
        .from('household_members')
        .select(`
          *,
          household:households (*)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      const membership = data as (HouseholdMember & { household: Household | null }) | null;

      return {
        user,
        household: membership?.household ?? null,
        currentMember: membership ? { ...membership, household: undefined } as unknown as HouseholdMember : null,
      };
    },
  });

  return {
    user: query.data?.user ?? null,
    household: query.data?.household ?? null,
    currentMember: query.data?.currentMember ?? null,
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    invalidate: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  };
}
