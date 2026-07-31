import { describe, it, expect, beforeEach, vi } from 'vitest';

const exchangeMock = vi.fn();
const setSessionMock = vi.fn();
const getSessionMock = vi.fn();
const verifyOtpMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: (...args: unknown[]) => exchangeMock(...args),
      setSession: (...args: unknown[]) => setSessionMock(...args),
      getSession: (...args: unknown[]) => getSessionMock(...args),
      verifyOtp: (...args: unknown[]) => verifyOtpMock(...args),
    },
  },
}));

import {
  isValidAuthCallbackUrl,
  parseAuthCallbackType,
  handleAuthCallbackUrl,
  isPkceVerifierError,
} from './handleAuthCallbackUrl';

const DEDUP_KEY = 'pastelly:auth-callback-seen';

describe('isValidAuthCallbackUrl', () => {
  it('accepts native pastelly scheme', () => {
    expect(isValidAuthCallbackUrl('pastelly://auth/callback')).toBe(true);
    expect(isValidAuthCallbackUrl('pastelly://auth/callback?code=abc')).toBe(true);
    expect(isValidAuthCallbackUrl('pastelly://auth/callback#access_token=x&refresh_token=y')).toBe(true);
  });

  it('accepts web /auth/callback', () => {
    expect(isValidAuthCallbackUrl('https://pastelly.no/auth/callback?code=abc')).toBe(true);
    expect(isValidAuthCallbackUrl('http://localhost:8080/auth/callback')).toBe(true);
  });

  it('rejects wrong paths and schemes', () => {
    expect(isValidAuthCallbackUrl('pastelly://other/callback')).toBe(false);
    expect(isValidAuthCallbackUrl('https://pastelly.no/other')).toBe(false);
    expect(isValidAuthCallbackUrl('not a url')).toBe(false);
    expect(isValidAuthCallbackUrl('javascript:alert(1)')).toBe(false);
  });
});

describe('parseAuthCallbackType', () => {
  it('detects PKCE code', () => {
    expect(parseAuthCallbackType('https://pastelly.no/auth/callback?code=abc')).toBe('code');
  });

  it('detects hash tokens', () => {
    expect(parseAuthCallbackType('pastelly://auth/callback#access_token=a&refresh_token=b')).toBe('token');
  });

  it('detects recovery type flag', () => {
    expect(parseAuthCallbackType('https://pastelly.no/auth/callback?code=x&type=recovery')).toBe('recovery');
    expect(parseAuthCallbackType('pastelly://auth/callback#type=recovery&access_token=a&refresh_token=b')).toBe('recovery');
  });

  it('detects token_hash', () => {
    expect(parseAuthCallbackType('https://pastelly.no/auth/callback?token_hash=abc&type=signup')).toBe(
      'token_hash',
    );
  });

  it('returns unknown when no params', () => {
    expect(parseAuthCallbackType('https://pastelly.no/auth/callback')).toBe('unknown');
  });
});

describe('isPkceVerifierError', () => {
  it('matches verifier messages', () => {
    expect(isPkceVerifierError('PKCE code verifier not found in storage')).toBe(true);
    expect(isPkceVerifierError('boom')).toBe(false);
  });
});

describe('handleAuthCallbackUrl dedup semantics', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    exchangeMock.mockReset();
    setSessionMock.mockReset();
    getSessionMock.mockReset();
    verifyOtpMock.mockReset();
  });

  it('does NOT mark dedup when exchangeCodeForSession fails', async () => {
    exchangeMock.mockResolvedValue({ error: { message: 'boom' } });
    const result = await handleAuthCallbackUrl('https://pastelly.no/auth/callback?code=abc123');
    expect(result.ok).toBe(false);
    expect(window.localStorage.getItem(DEDUP_KEY) ?? '').not.toContain('abc123');
  });

  it('marks dedup after successful exchange', async () => {
    exchangeMock.mockResolvedValue({ error: null });
    const result = await handleAuthCallbackUrl('https://pastelly.no/auth/callback?code=abc123');
    expect(result.ok).toBe(true);
    expect(window.localStorage.getItem(DEDUP_KEY)).toContain('abc123');
  });

  it('dedup hit with no session returns ok:false', async () => {
    exchangeMock.mockResolvedValue({ error: null });
    await handleAuthCallbackUrl('https://pastelly.no/auth/callback?code=abc123');
    exchangeMock.mockClear();
    getSessionMock.mockResolvedValue({ data: { session: null } });
    const result = await handleAuthCallbackUrl('https://pastelly.no/auth/callback?code=abc123');
    expect(exchangeMock).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
  });

  it('dedup hit with valid session returns ok:true', async () => {
    exchangeMock.mockResolvedValue({ error: null });
    await handleAuthCallbackUrl('https://pastelly.no/auth/callback?code=abc123');
    exchangeMock.mockClear();
    getSessionMock.mockResolvedValue({ data: { session: { access_token: 'x' } } });
    const result = await handleAuthCallbackUrl('https://pastelly.no/auth/callback?code=abc123');
    expect(exchangeMock).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });

  it('does NOT mark dedup when setSession fails', async () => {
    setSessionMock.mockResolvedValue({ error: { message: 'nope' } });
    const url = 'pastelly://auth/callback#access_token=aaaaaaaaaaaaaaaaTOKENEND&refresh_token=r';
    const result = await handleAuthCallbackUrl(url);
    expect(result.ok).toBe(false);
    expect(window.localStorage.getItem(DEDUP_KEY) ?? '').not.toContain('TOKENEND');
  });
});

describe('handleAuthCallbackUrl recovery state', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    exchangeMock.mockReset();
    setSessionMock.mockReset();
    getSessionMock.mockReset();
  });

  it('marks recovery flow ready after successful exchange with type=recovery', async () => {
    exchangeMock.mockResolvedValue({ error: null });
    const result = await handleAuthCallbackUrl(
      'https://pastelly.no/auth/callback?code=rec1&type=recovery',
    );
    expect(result.ok).toBe(true);
    const raw = window.localStorage.getItem('pastelly:recovery-state');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.isRecoveryFlow).toBe(true);
    expect(parsed.recoverySessionReady).toBe(true);
  });

  it('does NOT mark recovery flow for non-recovery web code exchange', async () => {
    exchangeMock.mockResolvedValue({ error: null });
    await handleAuthCallbackUrl('https://pastelly.no/auth/callback?code=signup1');
    expect(window.localStorage.getItem('pastelly:recovery-state')).toBeNull();
  });

  it('marks recovery flow when pendingRecoveryIntent is set (PKCE strips type=recovery)', async () => {
    exchangeMock.mockResolvedValue({ error: null });
    window.localStorage.setItem(
      'pastelly:pending-recovery-intent',
      JSON.stringify({ at: Date.now() }),
    );
    const result = await handleAuthCallbackUrl('pastelly://auth/callback?code=nativepkce');
    expect(result.ok).toBe(true);
    expect((result as { kind: string }).kind).toBe('recovery');
    const raw = window.localStorage.getItem('pastelly:recovery-state');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.isRecoveryFlow).toBe(true);
    expect(parsed.recoverySessionReady).toBe(true);
    // intent consumed
    expect(window.localStorage.getItem('pastelly:pending-recovery-intent')).toBeNull();
  });

  it('native pastelly:// code exchange WITHOUT pending intent is NOT recovery (signup deep link)', async () => {
    exchangeMock.mockResolvedValue({ error: null });
    const result = await handleAuthCallbackUrl('pastelly://auth/callback?code=nativenoint');
    expect(result.ok).toBe(true);
    expect((result as { kind: string }).kind).toBe('signup');
    expect(window.localStorage.getItem('pastelly:recovery-state')).toBeNull();
  });

  it('web code exchange with pending intent but no type is NOT recovery', async () => {
    exchangeMock.mockResolvedValue({ error: null });
    window.localStorage.setItem(
      'pastelly:pending-recovery-intent',
      JSON.stringify({ at: Date.now() }),
    );
    const result = await handleAuthCallbackUrl('https://pastelly.no/auth/callback?code=websignup');
    expect(result.ok).toBe(true);
    expect((result as { kind: string }).kind).toBe('signup');
    expect(window.localStorage.getItem('pastelly:recovery-state')).toBeNull();
  });

  it('explicit type=signup clears stale pendingRecoveryIntent and routes as signup', async () => {
    exchangeMock.mockResolvedValue({ error: null });
    window.localStorage.setItem(
      'pastelly:pending-recovery-intent',
      JSON.stringify({ at: Date.now() }),
    );
    const result = await handleAuthCallbackUrl(
      'https://pastelly.no/auth/callback?code=sup1&type=signup',
    );
    expect(result.ok).toBe(true);
    expect((result as { kind: string }).kind).toBe('signup');
    expect(window.localStorage.getItem('pastelly:pending-recovery-intent')).toBeNull();
    expect(window.localStorage.getItem('pastelly:recovery-state')).toBeNull();
  });

  it('native dedup path is NOT recovery when session exists without recovery intent', async () => {
    exchangeMock.mockResolvedValue({ error: null });
    await handleAuthCallbackUrl('pastelly://auth/callback?code=dedupnative');
    exchangeMock.mockClear();
    window.localStorage.removeItem('pastelly:recovery-state');
    getSessionMock.mockResolvedValue({ data: { session: { access_token: 'x' } } });
    const result = await handleAuthCallbackUrl('pastelly://auth/callback?code=dedupnative');
    expect(exchangeMock).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
    expect((result as { kind: string }).kind).not.toBe('recovery');
  });

  it('emits pastelly:recovery-navigate on successful recovery exchange (pending intent)', async () => {
    exchangeMock.mockResolvedValue({ error: null });
    window.localStorage.setItem(
      'pastelly:pending-recovery-intent',
      JSON.stringify({ at: Date.now() }),
    );
    const spy = vi.fn();
    window.addEventListener('pastelly:recovery-navigate', spy);
    await handleAuthCallbackUrl('pastelly://auth/callback?code=abc');
    window.removeEventListener('pastelly:recovery-navigate', spy);
    expect(spy).toHaveBeenCalled();
  });
});

describe('handleAuthCallbackUrl PKCE + token_hash', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    exchangeMock.mockReset();
    setSessionMock.mockReset();
    getSessionMock.mockReset();
    verifyOtpMock.mockReset();
  });

  it('maps missing PKCE verifier to login hint', async () => {
    exchangeMock.mockResolvedValue({
      error: { message: 'PKCE code verifier not found in storage. This can happen if...' },
    });
    const result = await handleAuthCallbackUrl('https://pastelly.no/auth/callback?code=abc123');
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.action).toBe('login');
      expect(result.error).toMatch(/aktivert|logg inn/i);
    }
  });

  it('verifies token_hash via verifyOtp', async () => {
    verifyOtpMock.mockResolvedValue({ error: null });
    const result = await handleAuthCallbackUrl(
      'https://pastelly.no/auth/callback?token_hash=th_abc123456789&type=signup',
    );
    expect(verifyOtpMock).toHaveBeenCalledWith({
      token_hash: 'th_abc123456789',
      type: 'signup',
    });
    expect(result).toEqual({ ok: true, kind: 'signup' });
  });

  it('no params with session succeeds', async () => {
    getSessionMock.mockResolvedValue({ data: { session: { access_token: 'x' } } });
    const result = await handleAuthCallbackUrl('https://pastelly.no/auth/callback');
    expect(result).toEqual({ ok: true, kind: 'unknown' });
  });

  it('no params without session soft-prompts login', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });
    const result = await handleAuthCallbackUrl('https://pastelly.no/auth/callback');
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.action).toBe('login');
      expect(result.error).toMatch(/bekreftelsen|logg inn/i);
    }
  });
});

