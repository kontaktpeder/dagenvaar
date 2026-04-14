import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type ListItem = Tables<'list_items'>;

export function useListItemsForDate(householdId: string | undefined, date: string) {
  return useQuery({
    queryKey: ['listItems', householdId, date],
    enabled: !!householdId && !!date,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('list_items')
        .select('*')
        .eq('household_id', householdId!)
        .eq('item_date', date)
        .order('sort_order')
        .order('created_at');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateListItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: TablesInsert<'list_items'>) => {
      const { error } = await supabase.from('list_items').insert(item);
      if (error) throw error;
      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listItems'] });
    },
  });
}

export function useToggleListItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_checked }: { id: string; is_checked: boolean }) => {
      const { error } = await supabase.from('list_items').update({ is_checked }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listItems'] });
    },
  });
}

export function useDeleteListItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('list_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listItems'] });
    },
  });
}
