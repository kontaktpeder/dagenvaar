/**
 * One-shot notice shown on the auth screen after the session was cleared
 * because the account is gone / invalid (e.g. deleted in Supabase), or after
 * an email-confirm callback that landed without tokens (Gmail → pastelly.no).
 */
const KEY = 'pastelly:session-notice';

export type SessionNotice = 'account_unavailable' | 'email_confirmed_login';

function safeSession(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

export function setSessionNotice(notice: SessionNotice): void {
  const store = safeSession();
  if (!store) return;
  try {
    store.setItem(KEY, notice);
  } catch {
    /* ignore */
  }
}

export function peekSessionNotice(): SessionNotice | null {
  const store = safeSession();
  if (!store) return null;
  try {
    const raw = store.getItem(KEY);
    if (raw === 'account_unavailable' || raw === 'email_confirmed_login') return raw;
    return null;
  } catch {
    return null;
  }
}

/** Read and clear the pending notice (one-shot). */
export function consumeSessionNotice(): SessionNotice | null {
  const store = safeSession();
  if (!store) return null;
  try {
    const raw = store.getItem(KEY);
    store.removeItem(KEY);
    if (raw === 'account_unavailable' || raw === 'email_confirmed_login') return raw;
    return null;
  } catch {
    return null;
  }
}
