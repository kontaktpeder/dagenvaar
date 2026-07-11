import { describe, it, expect } from 'vitest';
import { isValidAuthCallbackUrl, parseAuthCallbackType } from './handleAuthCallbackUrl';

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
    expect(
      parseAuthCallbackType('pastelly://auth/callback#access_token=a&refresh_token=b'),
    ).toBe('token');
  });

  it('detects recovery type flag', () => {
    expect(
      parseAuthCallbackType('https://pastelly.no/auth/callback?code=x&type=recovery'),
    ).toBe('recovery');
    expect(
      parseAuthCallbackType('pastelly://auth/callback#type=recovery&access_token=a&refresh_token=b'),
    ).toBe('recovery');
  });

  it('returns unknown when no params', () => {
    expect(parseAuthCallbackType('https://pastelly.no/auth/callback')).toBe('unknown');
  });
});
