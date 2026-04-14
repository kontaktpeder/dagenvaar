import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type HouseholdMember = Tables<'household_members'>;
export type Household = Tables<'households'>;

export function useHousehold() {
  return useQuery({
    queryKey: ['household'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('households')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useMembers(householdId: string | undefined) {
  return useQuery({
    queryKey: ['members', householdId],
    enabled: !!householdId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('household_members')
        .select('*')
        .eq('household_id', householdId!)
        .eq('is_active', true)
        .order('created_at');
      if (error) throw error;
      return data;
    },
  });
}

export function useCurrentMember(householdId: string | undefined) {
  return useQuery({
    queryKey: ['currentMember', householdId],
    enabled: !!householdId,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from('household_members')
        .select('*')
        .eq('household_id', householdId!)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateHousehold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, displayName, colorToken }: { name: string; displayName: string; colorToken: string }) => {
      const { data, error } = await supabase.rpc('create_household_with_owner', {
        p_name: name,
        p_display_name: displayName,
        p_color_token: colorToken,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['household'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['currentMember'] });
    },
  });
}
