import { describe, it, expect } from 'vitest';
import { shouldPromoteRecoveryPage } from './recoveryGating';

describe('shouldPromoteRecoveryPage', () => {
  it('returns false for regular session without recovery readiness', () => {
    expect(shouldPromoteRecoveryPage({ recoverySessionReady: false }, 'SIGNED_IN')).toBe(false);
    expect(shouldPromoteRecoveryPage({ recoverySessionReady: false }, 'INITIAL_SESSION')).toBe(false);
    expect(shouldPromoteRecoveryPage({ recoverySessionReady: false }, 'TOKEN_REFRESHED')).toBe(false);
    expect(shouldPromoteRecoveryPage({ recoverySessionReady: false }, null)).toBe(false);
  });

  it('returns true on PASSWORD_RECOVERY event', () => {
    expect(shouldPromoteRecoveryPage({ recoverySessionReady: false }, 'PASSWORD_RECOVERY')).toBe(true);
  });

  it('returns true when recoverySessionReady is true', () => {
    expect(shouldPromoteRecoveryPage({ recoverySessionReady: true }, null)).toBe(true);
    expect(shouldPromoteRecoveryPage({ recoverySessionReady: true }, 'SIGNED_IN')).toBe(true);
  });

  it('returns true on SIGNED_IN when recovery flow is active', () => {
    expect(
      shouldPromoteRecoveryPage(
        { recoverySessionReady: false, isRecoveryFlow: true },
        'SIGNED_IN',
      ),
    ).toBe(true);
  });

  it('returns true on SIGNED_IN when pending recovery intent is set', () => {
    expect(
      shouldPromoteRecoveryPage(
        { recoverySessionReady: false },
        'SIGNED_IN',
        { pendingIntent: true },
      ),
    ).toBe(true);
  });
});
