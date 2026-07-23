import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  clearStoredActiveHouseholdId,
  getStoredActiveHouseholdId,
  setStoredActiveHouseholdId,
} from '@/lib/activeHousehold';
import type { Tables } from '@/integrations/supabase/types';

export type Household = Tables<'households'>;
export type HouseholdMember = Tables<'household_members'>;

export type CalendarMembership = HouseholdMember & {
  household: Household;
};

const QUERY_KEY_BASE = 'current-household-context';

function pickActiveMembership(
  memberships: CalendarMembership[],
  preferredId: string | null,
): CalendarMembership | null {
  if (memberships.length === 0) return null;
  if (preferredId) {
    const match = memberships.find((m) => m.household_id === preferredId);
    if (match) return match;
  }
  const home = memberships.find((m) => m.household.kind === 'home');
  return home ?? memberships[0];
}

export function useCurrentHouseholdContext() {
  const queryClient = useQueryClient();
  const { user: authUser, loading: authLoading } = useAuth();
  const [activeHouseholdId, setActiveHouseholdIdState] = useState<string | null>(() =>
    getStoredActiveHouseholdId(),
  );

  const query = useQuery({
    queryKey: [QUERY_KEY_BASE, authUser?.id ?? null],
    queryFn: async () => {
      if (!authUser) return [] as CalendarMembership[];

      const { data, error } = await supabase
        .from('household_members')
        .select(`
          *,
          household:households (*)
        `)
        .eq('user_id', authUser.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return ((data ?? []) as (HouseholdMember & { household: Household | null })[])
        .filter((row): row is HouseholdMember & { household: Household } => !!row.household)
        .map((row) => ({
          ...row,
          household: row.household,
        }));
    },
    enabled: !authLoading,
  });

  const memberships = query.data ?? [];

  const activeMembership = useMemo(
    () => pickActiveMembership(memberships, activeHouseholdId),
    [memberships, activeHouseholdId],
  );

  useEffect(() => {
    if (!activeMembership) {
      if (memberships.length === 0 && activeHouseholdId) {
        clearStoredActiveHouseholdId();
        setActiveHouseholdIdState(null);
      }
      return;
    }
    if (activeHouseholdId !== activeMembership.household_id) {
      setActiveHouseholdIdState(activeMembership.household_id);
      setStoredActiveHouseholdId(activeMembership.household_id);
    }
  }, [activeMembership, activeHouseholdId, memberships.length]);

  const setActiveHouseholdId = useCallback((id: string) => {
    setActiveHouseholdIdState(id);
    setStoredActiveHouseholdId(id);
  }, []);

  const currentMember = useMemo(() => {
    if (!activeMembership) return null;
    const { household: _h, ...member } = activeMembership;
    return member as HouseholdMember;
  }, [activeMembership]);

  return {
    user: authUser,
    household: activeMembership?.household ?? null,
    currentMember,
    memberships,
    activeHouseholdId: activeMembership?.household_id ?? null,
    setActiveHouseholdId,
    loading: authLoading || query.isLoading,
    error: query.error,
    refetch: query.refetch,
    invalidate: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY_BASE] }),
  };
}
