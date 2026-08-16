import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./platform', () => ({
  isNativePlatform: vi.fn(() => false),
}));

import { isNativePlatform } from './platform';
import { AUTH_WEB_ORIGIN, getAuthRedirectUrl, getPasswordResetRedirectUrl, isLocalOrigin } from './authRedirect';

describe('isLocalOrigin', () => {
  it('accepts localhost variants', () => {
    expect(isLocalOrigin('http://localhost:5173')).toBe(true);
    expect(isLocalOrigin('http://127.0.0.1:3000')).toBe(true);
  });

  it('rejects production and preview hosts', () => {
    expect(isLocalOrigin('https://pastelly.no')).toBe(false);
    expect(isLocalOrigin('https://foo.lovable.app')).toBe(false);
  });
});

describe('getAuthRedirectUrl', () => {
  afterEach(() => {
    vi.mocked(isNativePlatform).mockReturnValue(false);
    vi.unstubAllEnvs();
  });

  it('returns native deep link on Capacitor', () => {
    vi.mocked(isNativePlatform).mockReturnValue(true);
    expect(getAuthRedirectUrl()).toBe('pastelly://auth/callback');
  });

  it('uses pastelly.no in production builds even on preview origins', () => {
    vi.stubEnv('DEV', false);
    expect(getAuthRedirectUrl()).toBe(`${AUTH_WEB_ORIGIN}/auth/callback`);
  });

  it('uses localhost in Vite DEV when on a local origin', () => {
    vi.stubEnv('DEV', true);
    // jsdom default location is typically http://localhost:3000/
    expect(isLocalOrigin(window.location.origin)).toBe(true);
    expect(getAuthRedirectUrl()).toBe(`${window.location.origin}/auth/callback`);
  });
});

describe('getPasswordResetRedirectUrl', () => {
  afterEach(() => {
    vi.mocked(isNativePlatform).mockReturnValue(false);
    vi.unstubAllEnvs();
  });

  it('appends intent=recovery on native', () => {
    vi.mocked(isNativePlatform).mockReturnValue(true);
    expect(getPasswordResetRedirectUrl()).toBe('pastelly://auth/callback?intent=recovery');
  });

  it('appends intent=recovery on web', () => {
    vi.stubEnv('DEV', false);
    expect(getPasswordResetRedirectUrl()).toBe(`${AUTH_WEB_ORIGIN}/auth/callback?intent=recovery`);
  });
});
