import { clearStoredActiveHouseholdId } from '@/lib/activeHousehold';
import { clearPendingInviteCode } from '@/lib/inviteLink';
import { clearPushUser } from '@/lib/native/push';
import { clearPendingRecoveryIntent } from './recoveryState';

/**
 * Drop every piece of per-user local state. Shared by sign-out, account
 * deletion and invalid-session cleanup so no path forgets one of them.
 */
export async function clearLocalUserState(): Promise<void> {
  clearPendingRecoveryIntent();
  clearStoredActiveHouseholdId();
  clearPendingInviteCode();
  await clearPushUser();
}
