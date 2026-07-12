import type { RecoveryState } from './recoveryState';

/**
 * Pure predicate: should the update-password page promote to `ready`?
 * True on the PASSWORD_RECOVERY event, when the recovery session has been
 * marked ready, or on SIGNED_IN while an active recovery flow / pending
 * intent is in progress (native PKCE fallback).
 */
export function shouldPromoteRecoveryPage(
  state: Pick<RecoveryState, 'recoverySessionReady'> & { isRecoveryFlow?: boolean },
  event: string | null,
  opts: { pendingIntent?: boolean } = {},
): boolean {
  if (event === 'PASSWORD_RECOVERY') return true;
  if (state.recoverySessionReady) return true;
  if ((state.isRecoveryFlow || opts.pendingIntent) && event === 'SIGNED_IN') return true;
  return false;
}
