/**
 * Short-lived lock while a CenteredPopup is dismissing.
 * Prevents rapid open/close churn from mounting a new sheet mid-flyOut.
 */
let dismissLockCount = 0;

export function isSheetDismissLocked(): boolean {
  return dismissLockCount > 0;
}

export function lockSheetDismiss(): void {
  dismissLockCount += 1;
}

export function unlockSheetDismiss(): void {
  dismissLockCount = Math.max(0, dismissLockCount - 1);
}
