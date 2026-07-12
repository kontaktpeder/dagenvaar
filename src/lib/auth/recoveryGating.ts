import type { RecoveryState } from './recoveryState';

/**
 * Pure predicate: should the update-password page promote to `ready`?
 * Only true for a real recovery signal — either the PASSWORD_RECOVERY
 * auth event, or a recovery state that has already been marked ready.
 */
export function shouldPromoteRecoveryPage(
  state: Pick<RecoveryState, 'recoverySessionReady'>,
  event: string | null,
): boolean {
  if (event === 'PASSWORD_RECOVERY') return true;
  if (state.recoverySessionReady) return true;
  return false;
}
