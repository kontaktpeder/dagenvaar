import { supabase } from '@/integrations/supabase/client';
import { logAuthDiagnostic } from './diagnostics';
import { startRecoveryFlow } from './recoveryState';

export type AuthCallbackKind = 'signup' | 'recovery' | 'magic_link' | 'unknown';

export type AuthCallbackResult =
  | { ok: true; kind: AuthCallbackKind }
  | { ok: false; error: string };

export type AuthCallbackType = 'code' | 'token' | 'recovery' | 'unknown';

const NATIVE_SCHEME = 'pastelly:';
const NATIVE_HOST = 'auth';
const NATIVE_PATH = '/callback';
const WEB_PATH = '/auth/callback';

/**
 * Persistent dedup across WebView reloads. On native, `App.getLaunchUrl()`
 * keeps returning the original recovery URL after `window.location.replace`,
 * so an in-memory Set gets wiped on reload and lets the same code be
 * processed twice. sessionStorage survives WebView reload but is cleared
 * when the native process is killed — exactly the semantics we want.
 */
const DEDUP_KEY = 'pastelly:auth-callback-seen';
const DEDUP_TTL_MS = 60_000;

type DedupEntry = { key: string; expiresAt: number };

function safeSession(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

function readDedup(): DedupEntry[] {
  const store = safeSession();
  if (!store) return [];
  try {
    const raw = store.getItem(DEDUP_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DedupEntry[];
    const now = Date.now();
    return Array.isArray(parsed) ? parsed.filter((e) => e.expiresAt > now) : [];
  } catch {
    return [];
  }
}

function writeDedup(entries: DedupEntry[]): void {
  const store = safeSession();
  if (!store) return;
  try {
    store.setItem(DEDUP_KEY, JSON.stringify(entries));
  } catch {
    /* ignore */
  }
}

function hasSeen(key: string): boolean {
  return readDedup().some((e) => e.key === key);
}

function markSeen(key: string): void {
  const entries = readDedup();
  if (entries.some((e) => e.key === key)) return;
  entries.push({ key, expiresAt: Date.now() + DEDUP_TTL_MS });
  writeDedup(entries);
}

async function dedupResultForKind(
  kind: AuthCallbackKind,
): Promise<AuthCallbackResult> {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    return { ok: true, kind };
  }
  return { ok: false, error: 'Gjenopprettingslenken er allerede brukt. Be om en ny e-post.' };
}


function safeParse(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function getHashParams(parsed: URL): URLSearchParams {
  const raw = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash;
  return new URLSearchParams(raw);
}

export function isValidAuthCallbackUrl(url: string): boolean {
  const parsed = safeParse(url);
  if (!parsed) return false;

  if (parsed.protocol === NATIVE_SCHEME) {
    return parsed.host === NATIVE_HOST && parsed.pathname === NATIVE_PATH;
  }

  if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
    return parsed.pathname === WEB_PATH;
  }

  return false;
}

export function parseAuthCallbackType(url: string): AuthCallbackType {
  const parsed = safeParse(url);
  if (!parsed) return 'unknown';

  const query = parsed.searchParams;
  const hash = getHashParams(parsed);

  if (query.get('type') === 'recovery' || hash.get('type') === 'recovery') {
    return 'recovery';
  }
  if (query.get('code')) return 'code';
  if (hash.get('access_token') && hash.get('refresh_token')) return 'token';
  return 'unknown';
}

export async function handleAuthCallbackUrl(url: string): Promise<AuthCallbackResult> {
  if (!isValidAuthCallbackUrl(url)) {
    logAuthDiagnostic('callback:invalid_url');
    return { ok: false, error: 'Ugyldig callback-URL' };
  }

  const parsed = safeParse(url)!;
  const type = parseAuthCallbackType(url);
  logAuthDiagnostic('callback:received', { type });

  const query = parsed.searchParams;
  const hash = getHashParams(parsed);
  const isRecoveryFlag =
    query.get('type') === 'recovery' || hash.get('type') === 'recovery';

  // Eagerly mark the recovery flow so the update-password page stays stable
  // while `exchangeCodeForSession` is still in flight. If the URL doesn't
  // carry `type=recovery` (PKCE often strips it), the `PASSWORD_RECOVERY`
  // auth event fired by Supabase after the exchange will start it instead.
  if (isRecoveryFlag) {
    startRecoveryFlow();
  }

  // 1. PKCE code first
  const code = query.get('code');
  if (code) {
    const dedupKey = `code:${code}`;
    const kind: AuthCallbackKind = isRecoveryFlag ? 'recovery' : 'signup';
    if (hasSeen(dedupKey)) {
      logAuthDiagnostic('callback:dedup_code');
      return dedupResultForKind(isRecoveryFlag ? 'recovery' : 'unknown');
    }
    logAuthDiagnostic('callback:exchange_start');
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      logAuthDiagnostic('callback:exchange_error');
      return { ok: false, error: error.message };
    }
    markSeen(dedupKey);
    logAuthDiagnostic('callback:exchange_ok');
    return { ok: true, kind };
  }

  // 2. Hash tokens fallback (implicit flow)
  const access_token = hash.get('access_token');
  const refresh_token = hash.get('refresh_token');
  if (access_token && refresh_token) {
    const dedupKey = `token:${access_token.slice(-16)}`;
    const kind: AuthCallbackKind = isRecoveryFlag ? 'recovery' : 'magic_link';
    if (hasSeen(dedupKey)) {
      logAuthDiagnostic('callback:dedup_token');
      return dedupResultForKind(isRecoveryFlag ? 'recovery' : 'unknown');
    }
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) {
      logAuthDiagnostic('callback:set_session_error');
      return { ok: false, error: error.message };
    }
    markSeen(dedupKey);
    logAuthDiagnostic('callback:set_session_ok');
    return { ok: true, kind };
  }

  logAuthDiagnostic('callback:no_params');
  return { ok: false, error: 'Ingen gyldige auth-parametere i callback' };
}
