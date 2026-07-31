import { isNativePlatform } from './platform';

/** Canonical web origin for auth email links (signup confirm, password reset). */
export const AUTH_WEB_ORIGIN = 'https://pastelly.no';

/**
 * Redirect URL for Supabase auth flows (signup confirmation, password reset, OAuth).
 * - Native: custom URL scheme handled by @capacitor/app deep links
 * - Production web / preview hosts: always pastelly.no (never Lovable web.app)
 * - Local Vite dev: current origin so email links can hit localhost
 */
export function getAuthRedirectUrl(): string {
  if (isNativePlatform()) {
    return 'pastelly://auth/callback';
  }

  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (isLocalOrigin(origin)) {
      return `${origin}/auth/callback`;
    }
  }

  return `${AUTH_WEB_ORIGIN}/auth/callback`;
}

export function isLocalOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  } catch {
    return false;
  }
}
