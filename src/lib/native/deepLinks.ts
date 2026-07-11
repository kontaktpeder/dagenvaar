import { App, type URLOpenListenerEvent } from '@capacitor/app';
import { supabase } from '@/integrations/supabase/client';
import { isNativePlatform } from './platform';

/**
 * Parse a deep-link URL like `pastelly://auth/callback#access_token=...&refresh_token=...`
 * or `?code=...` and hand tokens to Supabase.
 */
async function handleAuthUrl(url: string): Promise<void> {
  try {
    const parsed = new URL(url);

    // Hash-based tokens (implicit flow)
    const hash = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash;
    if (hash) {
      const params = new URLSearchParams(hash);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
        return;
      }
    }

    // PKCE code exchange
    const code = parsed.searchParams.get('code');
    if (code) {
      await supabase.auth.exchangeCodeForSession(code);
    }
  } catch (err) {
    console.error('Deep link auth error', err);
  }
}

export async function initDeepLinks(): Promise<void> {
  if (!isNativePlatform()) return;

  // Cold start
  try {
    const { url } = await App.getLaunchUrl() ?? { url: '' };
    if (url && url.includes('auth/callback')) {
      await handleAuthUrl(url);
    }
  } catch {
    // ignore
  }

  // Warm resume
  App.addListener('appUrlOpen', async (event: URLOpenListenerEvent) => {
    if (event.url && event.url.includes('auth/callback')) {
      await handleAuthUrl(event.url);
    }
  });
}
