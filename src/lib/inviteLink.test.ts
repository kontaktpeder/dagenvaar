import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  buildInviteUrl,
  buildInviteShareText,
  captureInviteCodeFromLocation,
  extractInviteCodeFromText,
  inviteJoinErrorKind,
  isPlausibleInviteCode,
  normalizeInviteCode,
  peekPendingInviteCode,
  clearPendingInviteCode,
  setPendingInviteCode,
} from './inviteLink';

describe('inviteLink', () => {
  beforeEach(() => {
    clearPendingInviteCode();
    localStorage.clear();
  });

  afterEach(() => {
    clearPendingInviteCode();
  });

  it('normalizes codes', () => {
    expect(normalizeInviteCode(' ab12-cd34 ')).toBe('AB12-CD34');
  });

  it('accepts only AB12-CD34 shape', () => {
    expect(isPlausibleInviteCode('AB12-CD34')).toBe(true);
    expect(isPlausibleInviteCode('2954B520-8B43-4CDE-AF30-7EF1A2B3C4D5')).toBe(false);
    expect(isPlausibleInviteCode('B520-8B43')).toBe(true); // shape ok, but may be wrong code
  });

  it('builds join url', () => {
    expect(buildInviteUrl('ab12-cd34')).toBe('https://pastelly.no/join?code=AB12-CD34');
  });

  it('builds share text with code first', () => {
    const text = buildInviteShareText('AB12-CD34', {
      greeting: 'Hei',
      codeLabel: 'Kode:',
      linkHint: 'Åpne lenken',
    });
    expect(text).toContain('Kode: AB12-CD34');
    expect(text).toContain('https://pastelly.no/join?code=AB12-CD34');
  });

  it('extracts code from share text, not UUID fragments', () => {
    const share = `Hei!\n\nKode: XY98-ZT76\nhttps://pastelly.no/join?code=XY98-ZT76\n`;
    expect(extractInviteCodeFromText(share)).toBe('XY98-ZT76');

    expect(
      extractInviteCodeFromText('2954B520-8B43-4CDE-AF30-7EF1A2B3C4D5'),
    ).toBeNull();

    expect(extractInviteCodeFromText('AB12-CD34')).toBe('AB12-CD34');
  });

  it('captures code from join query and persists', () => {
    const replaceState = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
    const code = captureInviteCodeFromLocation({
      pathname: '/join',
      search: '?code=ab12-cd34',
      hash: '',
    });
    expect(code).toBe('AB12-CD34');
    expect(peekPendingInviteCode()).toBe('AB12-CD34');
    expect(replaceState).toHaveBeenCalled();
    replaceState.mockRestore();
  });

  it('does not capture auth callback codes or UUIDs', () => {
    const replaceState = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});

    expect(
      captureInviteCodeFromLocation({
        pathname: '/auth/callback',
        search: '?code=pkce-auth-code-that-is-long',
        hash: '',
      }),
    ).toBeNull();

    expect(
      captureInviteCodeFromLocation({
        pathname: '/join',
        search: '?code=2954B520-8B43-4CDE-AF30-7EF1A2B3C4D5',
        hash: '',
      }),
    ).toBeNull();

    expect(peekPendingInviteCode()).toBeNull();
    expect(replaceState).not.toHaveBeenCalled();
    replaceState.mockRestore();
  });

  it('clears implausible stored pending codes', () => {
    localStorage.setItem('pastelly_pending_invite_code', '2954B520-8B43-4CDE-AF30-7EF1A2B3C4D5');
    expect(peekPendingInviteCode()).toBeNull();
    expect(localStorage.getItem('pastelly_pending_invite_code')).toBeNull();
  });

  it('refuses to store implausible pending codes', () => {
    setPendingInviteCode('2954B520-8B43-4CDE-AF30-7EF1A2B3C4D5');
    expect(peekPendingInviteCode()).toBeNull();
  });

  it('maps join errors', () => {
    expect(inviteJoinErrorKind('Invalid or expired invite code')).toBe('invalid');
    expect(inviteJoinErrorKind('Du er allerede medlem av denne kalenderen')).toBe('already');
    expect(inviteJoinErrorKind('network down')).toBe('generic');
  });
});
