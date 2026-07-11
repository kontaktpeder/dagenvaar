import { supabase } from '@/integrations/supabase/client';
import { getAuthRedirectUrl } from '@/lib/native/authRedirect';
import { normalizeAuthError, type NormalizedAuthError } from './normalizeAuthError';

export type RequestPasswordResetResult =
  | { ok: true }
  | { ok: false; error: NormalizedAuthError };

/**
 * Send password reset email.
 * Only the `error` field determines failure — `data` is always ignored,
 * because Supabase returns { data: {}, error: null } on success.
 */
export async function requestPasswordReset(
  email: string
): Promise<RequestPasswordResetResult> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getAuthRedirectUrl(),
  });

  if (error) {
    if (import.meta.env.DEV) {
      const err = error as { name?: string; message?: string; status?: number; code?: string };
      // eslint-disable-next-line no-console
      console.info('[auth] resetPasswordForEmail error', {
        name: err?.name,
        message: err?.message,
        status: err?.status,
        code: err?.code,
      });
      // eslint-disable-next-line no-console
      console.debug('[auth] resetPasswordForEmail error (full)', error);
    }
    return { ok: false, error: normalizeAuthError(error) };
  }

  return { ok: true };
}
