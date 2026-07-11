import { supabase } from '@/integrations/supabase/client';
import { logAuthDiagnostic } from './diagnostics';

export type AuthCallbackKind = 'signup' | 'recovery' | 'magic_link' | 'unknown';

export type AuthCallbackResult =
  | { ok: true; kind: AuthCallbackKind }
  | { ok: false; error: string };

export type AuthCallbackType = 'code' | 'token' | 'recovery' | 'unknown';

const NATIVE_SCHEME = 'pastelly:';
const NATIVE_HOST = 'auth';
const NATIVE_PATH = '/callback';
const WEB_PATH = '/auth/callback';

/** In-memory dedup — same code/token pair is only processed once per app session. */
const seenTokens = new Set<string>();
const DEDUP_TTL_MS = 60_000;

function markSeen(key: string): boolean {
  if (seenTokens.has(key)) return true;
  seenTokens.add(key);
  setTimeout(() => seenTokens.delete(key), DEDUP_TTL_MS);
  return false;
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

  // 1. PKCE code first
  const code = query.get('code');
  if (code) {
    if (markSeen(`code:${code}`)) {
      logAuthDiagnostic('callback:dedup_code');
      return { ok: true, kind: isRecoveryFlag ? 'recovery' : 'unknown' };
    }
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      logAuthDiagnostic('callback:exchange_error');
      return { ok: false, error: error.message };
    }
    logAuthDiagnostic('callback:exchange_ok');
    return { ok: true, kind: isRecoveryFlag ? 'recovery' : 'signup' };
  }

  // 2. Hash tokens fallback (implicit flow)
  const access_token = hash.get('access_token');
  const refresh_token = hash.get('refresh_token');
  if (access_token && refresh_token) {
    const dedupKey = `token:${access_token.slice(-16)}`;
    if (markSeen(dedupKey)) {
      logAuthDiagnostic('callback:dedup_token');
      return { ok: true, kind: isRecoveryFlag ? 'recovery' : 'unknown' };
    }
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) {
      logAuthDiagnostic('callback:set_session_error');
      return { ok: false, error: error.message };
    }
    logAuthDiagnostic('callback:set_session_ok');
    return { ok: true, kind: isRecoveryFlag ? 'recovery' : 'magic_link' };
  }

  logAuthDiagnostic('callback:no_params');
  return { ok: false, error: 'Ingen gyldige auth-parametere i callback' };
}
