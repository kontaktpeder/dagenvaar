import { describe, it, expect, beforeEach, vi } from 'vitest';

const exchangeMock = vi.fn();
const setSessionMock = vi.fn();
const getSessionMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: (...args: unknown[]) => exchangeMock(...args),
      setSession: (...args: unknown[]) => setSessionMock(...args),
      getSession: (...args: unknown[]) => getSessionMock(...args),
    },
  },
}));

import {
  isValidAuthCallbackUrl,
  parseAuthCallbackType,
  handleAuthCallbackUrl,
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

  it('returns unknown when no params', () => {
    expect(parseAuthCallbackType('https://pastelly.no/auth/callback')).toBe('unknown');
  });
});

describe('handleAuthCallbackUrl dedup semantics', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    exchangeMock.mockReset();
    setSessionMock.mockReset();
    getSessionMock.mockReset();
  });

  it('does NOT mark dedup when exchangeCodeForSession fails', async () => {
    exchangeMock.mockResolvedValue({ error: { message: 'boom' } });
    const result = await handleAuthCallbackUrl('https://pastelly.no/auth/callback?code=abc123');
    expect(result.ok).toBe(false);
    expect(window.sessionStorage.getItem(DEDUP_KEY) ?? '').not.toContain('abc123');
  });

  it('marks dedup after successful exchange', async () => {
    exchangeMock.mockResolvedValue({ error: null });
    const result = await handleAuthCallbackUrl('https://pastelly.no/auth/callback?code=abc123');
    expect(result.ok).toBe(true);
    expect(window.sessionStorage.getItem(DEDUP_KEY)).toContain('abc123');
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
    expect(window.sessionStorage.getItem(DEDUP_KEY) ?? '').not.toContain('TOKENEND');
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
    const raw = window.sessionStorage.getItem('pastelly:recovery-state');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.isRecoveryFlow).toBe(true);
    expect(parsed.recoverySessionReady).toBe(true);
  });

  it('does NOT mark recovery flow for non-recovery web code exchange', async () => {
    exchangeMock.mockResolvedValue({ error: null });
    await handleAuthCallbackUrl('https://pastelly.no/auth/callback?code=signup1');
    expect(window.sessionStorage.getItem('pastelly:recovery-state')).toBeNull();
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
    const raw = window.sessionStorage.getItem('pastelly:recovery-state');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.isRecoveryFlow).toBe(true);
    expect(parsed.recoverySessionReady).toBe(true);
    // intent consumed
    expect(window.localStorage.getItem('pastelly:pending-recovery-intent')).toBeNull();
  });

  it('native pastelly:// code exchange ALWAYS finalizes as recovery, even without pending intent', async () => {
    exchangeMock.mockResolvedValue({ error: null });
    const result = await handleAuthCallbackUrl('pastelly://auth/callback?code=nativenoint');
    expect(result.ok).toBe(true);
    expect((result as { kind: string }).kind).toBe('recovery');
    const raw = window.sessionStorage.getItem('pastelly:recovery-state');
    const parsed = JSON.parse(raw!);
    expect(parsed.recoverySessionReady).toBe(true);
  });

  it('native dedup path finalizes as recovery when session exists', async () => {
    exchangeMock.mockResolvedValue({ error: null });
    await handleAuthCallbackUrl('pastelly://auth/callback?code=dedupnative');
    exchangeMock.mockClear();
    window.sessionStorage.removeItem('pastelly:recovery-state');
    getSessionMock.mockResolvedValue({ data: { session: { access_token: 'x' } } });
    const result = await handleAuthCallbackUrl('pastelly://auth/callback?code=dedupnative');
    expect(exchangeMock).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
    expect((result as { kind: string }).kind).toBe('recovery');
  });

  it('emits pastelly:recovery-navigate on successful recovery exchange', async () => {
    exchangeMock.mockResolvedValue({ error: null });
    const spy = vi.fn();
    window.addEventListener('pastelly:recovery-navigate', spy);
    await handleAuthCallbackUrl('pastelly://auth/callback?code=abc');
    window.removeEventListener('pastelly:recovery-navigate', spy);
    expect(spy).toHaveBeenCalled();
  });
});

