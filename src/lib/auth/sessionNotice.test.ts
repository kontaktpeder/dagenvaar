import { describe, it, expect, beforeEach } from 'vitest';
import { consumeSessionNotice, setSessionNotice } from './sessionNotice';

describe('sessionNotice', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('stores and consumes account_unavailable once', () => {
    setSessionNotice('account_unavailable');
    expect(consumeSessionNotice()).toBe('account_unavailable');
    expect(consumeSessionNotice()).toBeNull();
  });

  it('returns null when empty', () => {
    expect(consumeSessionNotice()).toBeNull();
  });
});
