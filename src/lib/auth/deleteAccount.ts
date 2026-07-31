import { supabase } from '@/integrations/supabase/client';
import { clearLocalUserState } from './localReset';

/**
 * Permanently delete the signed-in account. The edge function removes the user
 * from all calendars (deleting calendars where they were alone) and then
 * deletes the auth user, so the local session is always dropped afterwards.
 */
export async function deleteAccount(): Promise<void> {
  const { data, error } = await supabase.functions.invoke('delete-account');

  const serverError = (data as { error?: string } | null)?.error;
  if (error || serverError) {
    throw new Error(serverError || error?.message || 'Kunne ikke slette kontoen');
  }

  await clearLocalUserState();
  await supabase.auth.signOut({ scope: 'local' });
}
