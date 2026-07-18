import OneSignal from '@onesignal/capacitor-plugin';
import { isNativePlatform } from './platform';

let initPromise: Promise<boolean> | null = null;
let identifiedUserId: string | null = null;

function appId(): string | undefined {
  const id = import.meta.env.VITE_ONESIGNAL_APP_ID;
  return typeof id === 'string' && id.trim() ? id.trim() : undefined;
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
