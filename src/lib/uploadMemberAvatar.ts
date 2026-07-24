import { supabase } from '@/integrations/supabase/client';

/** Upload cropped avatar and set household_members.avatar_url. */
export async function uploadMemberAvatar(opts: {
  householdId: string;
  memberId: string;
  blob: Blob;
}): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error('Ikke innlogget');

  const filePath = `${userId}/${opts.householdId}/avatar.jpg`;

  const { error: uploadErr } = await supabase.storage
    .from('avatars')
    .upload(filePath, opts.blob, { upsert: true, contentType: 'image/jpeg' });
  if (uploadErr) throw uploadErr;

  const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(filePath);
  const avatarUrl = `${publicData.publicUrl}?t=${Date.now()}`;

  const { error: updateErr } = await supabase
    .from('household_members')
    .update({ avatar_url: avatarUrl })
    .eq('id', opts.memberId)
    .eq('household_id', opts.householdId);
  if (updateErr) throw updateErr;

  return avatarUrl;
}

/** Resolve current user's membership id in a household. */
export async function getCurrentMemberId(householdId: string): Promise<string | null> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from('household_members')
    .select('id')
    .eq('household_id', householdId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}
