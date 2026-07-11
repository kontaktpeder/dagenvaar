import { describe, it, expect, beforeEach } from 'vitest';
import {
  clearRecoveryFlow,
  getRecoveryState,
  markRecoverySessionReady,
  startRecoveryFlow,
} from './recoveryState';

describe('recoveryState', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('starts empty', () => {
    const state = getRecoveryState();
    expect(state.isRecoveryFlow).toBe(false);
    expect(state.recoverySessionReady).toBe(false);
  });

  it('startRecoveryFlow sets isRecoveryFlow=true and persists to sessionStorage', () => {
    startRecoveryFlow();
    const state = getRecoveryState();
    expect(state.isRecoveryFlow).toBe(true);
    expect(state.recoveryStartedAt).toBeGreaterThan(0);
    // Persisted across "reload" (new read):
    expect(window.sessionStorage.getItem('pastelly:recovery-state')).not.toBeNull();
  });

  it('markRecoverySessionReady flips readiness without wiping the flow', () => {
    startRecoveryFlow();
    markRecoverySessionReady();
    const state = getRecoveryState();
    expect(state.isRecoveryFlow).toBe(true);
    expect(state.recoverySessionReady).toBe(true);
  });

  it('clearRecoveryFlow removes the state', () => {
    startRecoveryFlow();
    markRecoverySessionReady();
    clearRecoveryFlow();
    const state = getRecoveryState();
    expect(state.isRecoveryFlow).toBe(false);
    expect(window.sessionStorage.getItem('pastelly:recovery-state')).toBeNull();
  });

  it('expires after TTL', () => {
    startRecoveryFlow();
    // Backdate startedAt by 11 minutes
    const raw = JSON.parse(window.sessionStorage.getItem('pastelly:recovery-state')!);
    raw.recoveryStartedAt = Date.now() - 11 * 60 * 1000;
    window.sessionStorage.setItem('pastelly:recovery-state', JSON.stringify(raw));

    const state = getRecoveryState();
    expect(state.isRecoveryFlow).toBe(false);
  });

  it('startRecoveryFlow is idempotent — does not reset startedAt if already active', () => {
    startRecoveryFlow();
    const first = getRecoveryState().recoveryStartedAt;
    startRecoveryFlow();
    const second = getRecoveryState().recoveryStartedAt;
    expect(second).toBe(first);
  });
});
