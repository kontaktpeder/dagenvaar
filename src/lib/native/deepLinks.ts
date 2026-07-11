import { App, type URLOpenListenerEvent, type PluginListenerHandle } from '@capacitor/app';
import { isNativePlatform } from './platform';
import {
  handleAuthCallbackUrl,
  isValidAuthCallbackUrl,
} from '@/lib/auth/handleAuthCallbackUrl';
import { logAuthDiagnostic } from '@/lib/auth/diagnostics';

let initialized = false;
let listenerHandle: PluginListenerHandle | null = null;

async function routeAfterAuth(kind: string): Promise<void> {
  if (kind === 'recovery') {
    // On native the WebView owns navigation.
    window.location.replace('/auth/update-password');
  }
}

async function processUrl(url: string, source: 'cold' | 'warm'): Promise<void> {
  if (!isValidAuthCallbackUrl(url)) return;
  logAuthDiagnostic(source === 'cold' ? 'deeplinks:cold_start' : 'deeplinks:warm_open');
  const result = await handleAuthCallbackUrl(url);
  if (result.ok) {
    await routeAfterAuth(result.kind);
  }
}

export async function initDeepLinks(): Promise<void> {
  if (!isNativePlatform()) return;
  if (initialized) return;
  initialized = true;
  logAuthDiagnostic('deeplinks:init:once');

  // Cold start
  try {
    const launch = await App.getLaunchUrl();
    const url = launch?.url ?? '';
    if (url) await processUrl(url, 'cold');
  } catch {
    /* ignore */
  }

  // Warm resume — dedup inside handleAuthCallbackUrl prevents double processing
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
