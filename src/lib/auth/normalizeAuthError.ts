export interface NormalizedAuthError {
  message: string;
  name?: string;
  status?: number;
  code?: string;
}

/**
 * Normalize a Supabase auth error into a user-facing message.
 * Never returns an object; always a safe string.
 */
export function normalizeAuthError(error: unknown): NormalizedAuthError {
  if (!error || typeof error !== 'object') {
    return { message: 'Kunne ikke sende e-post.' };
  }

  const err = error as {
    name?: string;
    message?: string;
    status?: number;
    code?: string;
  };

  const status = typeof err.status === 'number' ? err.status : undefined;
  const code = typeof err.code === 'string' ? err.code : undefined;

  // Rate limit
  if (status === 429 || code === 'over_email_send_rate_limit') {
    return {
      message: 'For mange forsøk. Vent litt før du prøver igjen.',
      name: err.name,
      status,
      code,
    };
  }

  const message =
    typeof err.message === 'string' && err.message.trim().length > 0
      ? err.message
      : 'Kunne ikke sende e-post.';

  return { message, name: err.name, status, code };
}
