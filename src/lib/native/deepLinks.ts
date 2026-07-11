import { App, type URLOpenListenerEvent } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { isNativePlatform } from './platform';
import {
  handleAuthCallbackUrl,
  isValidAuthCallbackUrl,
} from '@/lib/auth/handleAuthCallbackUrl';
import { logAuthDiagnostic } from '@/lib/auth/diagnostics';

let initialized = false;
let listenerHandle: PluginListenerHandle | null = null;
let coldStartProcessed = false;

async function processUrl(url: string, source: 'cold' | 'warm'): Promise<void> {
  if (!isValidAuthCallbackUrl(url)) return;
  logAuthDiagnostic(source === 'cold' ? 'deeplinks:cold_start' : 'deeplinks:warm_open');
  // We deliberately do NOT navigate here. Routing to /auth/update-password
  // is owned by the global RecoveryRouter, which listens to Supabase's
  // `PASSWORD_RECOVERY` auth event (authoritative) and to the persistent
  // recovery state. This avoids `window.location.replace`, which would
  // cause a full WebView reload and re-trigger deep-link processing.
  await handleAuthCallbackUrl(url);
}

export async function initDeepLinks(): Promise<void> {
  if (!isNativePlatform()) return;
  if (initialized) return;
  initialized = true;
  logAuthDiagnostic('deeplinks:init:once');

  // Cold start — process at most once per native process, even across
  // WebView reloads. `App.getLaunchUrl()` keeps returning the same URL
  // after a reload, so guard with sessionStorage-persistent dedup inside
  // handleAuthCallbackUrl AND a local one-shot flag.
  if (!coldStartProcessed) {
    coldStartProcessed = true;
    try {
      const launch = await App.getLaunchUrl();
      const url = launch?.url ?? '';
      if (url) await processUrl(url, 'cold');
    } catch {
      /* ignore */
    }
  }

  // Warm resume
  listenerHandle = await App.addListener('appUrlOpen', async (event: URLOpenListenerEvent) => {
    if (event.url) await processUrl(event.url, 'warm');
  });
}

export async function removeDeepLinkListeners(): Promise<void> {
  if (listenerHandle) {
    await listenerHandle.remove();
    listenerHandle = null;
  }
  initialized = false;
}
