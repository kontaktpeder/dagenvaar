import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  buildInviteUrl,
  buildInviteShareText,
  captureInviteCodeFromLocation,
  normalizeInviteCode,
  peekPendingInviteCode,
  clearPendingInviteCode,
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

  it('captures code from query and persists', () => {
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
});
