import OneSignal from '@onesignal/capacitor-plugin';
import { isNativePlatform } from './platform';
import { setPendingOpenDay } from './pendingOpenDay';
import { setPendingOpenCountdown } from './pendingOpenCountdown';

let initPromise: Promise<boolean> | null = null;
let identifiedUserId: string | null = null;
let clickListenerAttached = false;

function appId(): string | undefined {
  const id = import.meta.env.VITE_ONESIGNAL_APP_ID;
  return typeof id === 'string' && id.trim() ? id.trim() : undefined;
}

function attachClickListener(): void {
  if (clickListenerAttached) return;
  clickListenerAttached = true;
  try {
    OneSignal.Notifications.addEventListener('click', (event) => {
      const raw = event?.notification?.additionalData as Record<string, unknown> | undefined;
      const countdownId =
        typeof raw?.countdown_id === 'string' && raw.countdown_id ? raw.countdown_id : null;
      if (countdownId) {
        setPendingOpenCountdown(countdownId);
      }
      const date =
        (typeof raw?.date === 'string' && raw.date) ||
        (typeof raw?.event_date === 'string' && raw.event_date) ||
        null;
      if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        setPendingOpenDay(date);
      }
    });
  } catch (err) {
    console.warn('[push] click listener failed', err);
  }
}

async function ensureInitialized(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const id = appId();
    if (!id) {
      console.warn('[push] VITE_ONESIGNAL_APP_ID missing — push disabled');
      return false;
    }
    try {
      await OneSignal.initialize(id);
      attachClickListener();
      return true;
    } catch (err) {
      console.warn('[push] initialize failed', err);
      return false;
    }
  })();

  return initPromise;
}

/** Call once on native launch (safe to call multiple times). */
export async function initPush(): Promise<void> {
  await ensureInitialized();
}

/** Link this device to the signed-in Pastelly user (Supabase auth UUID). */
export async function identifyPushUser(userId: string): Promise<void> {
  const ready = await ensureInitialized();
  if (!ready) return;
  if (identifiedUserId === userId) return;

  try {
    await OneSignal.login(userId);
    identifiedUserId = userId;
    await OneSignal.Notifications.requestPermission(false);
  } catch (err) {
    console.warn('[push] login/permission failed', err);
  }
}

/** Clear OneSignal user binding on sign-out. */
export async function clearPushUser(): Promise<void> {
  const ready = await ensureInitialized();
  if (!ready) return;
  identifiedUserId = null;
  try {
    await OneSignal.logout();
  } catch (err) {
    console.warn('[push] logout failed', err);
  }
}
