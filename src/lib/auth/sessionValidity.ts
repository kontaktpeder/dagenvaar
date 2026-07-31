export type SessionUserCheck = 'valid' | 'gone' | 'unknown';

type MaybeAuthError = {
  name?: string;
  status?: number;
  message?: string;
} | null;

/**
 * Only treat an explicit auth rejection as "account is gone". Network failures
 * must stay `unknown`, otherwise a flaky connection signs the user out.
 */
export function classifySessionUserError(error: MaybeAuthError): SessionUserCheck {
  if (!error) return 'valid';

  if (error.name === 'AuthRetryableFetchError' || error.name === 'TypeError') {
    return 'unknown';
  }

  const status = error.status;
  if (status === 401 || status === 403 || status === 404) return 'gone';
  if (typeof status === 'number' && status >= 500) return 'unknown';
  if (!status) return 'unknown';

  if (/user.*not.*found|user_not_found|invalid.*token/i.test(error.message ?? '')) {
    return 'gone';
  }

  return 'unknown';
}
