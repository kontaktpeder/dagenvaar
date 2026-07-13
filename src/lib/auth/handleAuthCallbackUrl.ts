import { supabase } from '@/integrations/supabase/client';
import { logAuthDiagnostic } from './diagnostics';
import {
  clearPendingRecoveryIntent,
  getRecoveryState,
  hasPendingRecoveryIntent,
  markRecoverySessionReady,
  startRecoveryFlow,
} from './recoveryState';


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
 * keeps returning the original recovery URL after a WebView reload, so an
 * in-memory Set gets wiped and lets the same code be processed twice.
 */
const DEDUP_KEY = 'pastelly:auth-callback-seen';
const DEDUP_TTL_MS = 60_000;

type DedupEntry = { key: string; expiresAt: number };

function safeLocal(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function readDedup(): DedupEntry[] {
  const store = safeLocal();
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
  const store = safeLocal();
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
    // Rehydrate recovery readiness so a WebView reload mid-flow still
    // lands on /auth/update-password instead of hanging on "checking".
    const rs = getRecoveryState();
    const pending = hasPendingRecoveryIntent();
    if (kind === 'recovery' || rs.isRecoveryFlow || pending) {
      startRecoveryFlow();
      markRecoverySessionReady();
      emitRecoveryNavigate();
      clearPendingRecoveryIntent();
      return { ok: true, kind: 'recovery' };
    }
    return { ok: true, kind };
  }
  return { ok: false, error: 'Gjenopprettingslenken er allerede brukt. Be om en ny e-post.' };
}

function emitRecoveryNavigate(): void {
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pastelly:recovery-navigate'));
    }
  } catch {
    /* ignore */
  }
}

function hasPkceCodeVerifier(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key?.endsWith('-code-verifier')) return true;
    }
  } catch {
    /* ignore */
  }
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
  const explicitType = query.get('type') ?? hash.get('type') ?? null;
  const isRecoveryFlag = explicitType === 'recovery';
  // Explicit non-recovery URL types (signup, magiclink, invite, email_change).
  // If Supabase tells us the link is anything other than recovery, honor it
  // and drop any stale pendingRecoveryIntent — otherwise a leftover intent
  // from an earlier "forgot password" attempt would hijack signup links.
  const isExplicitNonRecovery = !!explicitType && explicitType !== 'recovery';
  if (isExplicitNonRecovery && hasPendingRecoveryIntent()) {
    clearPendingRecoveryIntent();
  }

  // Recovery only when: URL explicitly marked recovery, or a pending
  // recovery intent exists (native PKCE strips `type=recovery`). We do NOT
  // treat every native `pastelly://` link as recovery — signup deep links
  // arrive on the same scheme and must route normally.
  const pendingIntent = hasPendingRecoveryIntent();
  const treatAsRecovery = isRecoveryFlag || (pendingIntent && !isExplicitNonRecovery);
  if (treatAsRecovery) {
    startRecoveryFlow();
  }

  // 1. PKCE code first
  const code = query.get('code');
  if (code) {
    const dedupKey = `code:${code}`;
    let kind: AuthCallbackKind = treatAsRecovery ? 'recovery' : 'signup';
    if (hasSeen(dedupKey)) {
      logAuthDiagnostic('callback:dedup_code');
      return dedupResultForKind(treatAsRecovery ? 'recovery' : 'unknown');
    }
    logAuthDiagnostic('callback:pkce_verifier', { present: hasPkceCodeVerifier() });
    logAuthDiagnostic('callback:exchange_start');
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      logAuthDiagnostic('callback:exchange_error');
      return { ok: false, error: error.message };
    }
    markSeen(dedupKey);
    logAuthDiagnostic('callback:exchange_ok');
    const rsAfter = getRecoveryState();
    if (treatAsRecovery || rsAfter.isRecoveryFlow) {
      startRecoveryFlow();
      markRecoverySessionReady();
      emitRecoveryNavigate();
      clearPendingRecoveryIntent();
      kind = 'recovery';
    }
    return { ok: true, kind };
  }

  // 2. Hash tokens fallback (implicit flow)
  const access_token = hash.get('access_token');
  const refresh_token = hash.get('refresh_token');
  if (access_token && refresh_token) {
    const dedupKey = `token:${access_token.slice(-16)}`;
    let kind: AuthCallbackKind = treatAsRecovery ? 'recovery' : 'magic_link';
    if (hasSeen(dedupKey)) {
      logAuthDiagnostic('callback:dedup_token');
      return dedupResultForKind(treatAsRecovery ? 'recovery' : 'unknown');
    }
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) {
      logAuthDiagnostic('callback:set_session_error');
      return { ok: false, error: error.message };
    }
    markSeen(dedupKey);
    logAuthDiagnostic('callback:set_session_ok');
    if (treatAsRecovery || getRecoveryState().isRecoveryFlow) {
      startRecoveryFlow();
      markRecoverySessionReady();
      emitRecoveryNavigate();
      clearPendingRecoveryIntent();
      kind = 'recovery';
    }
    return { ok: true, kind };
  }

  logAuthDiagnostic('callback:no_params');
  return { ok: false, error: 'Ingen gyldige auth-parametere i callback' };
}
