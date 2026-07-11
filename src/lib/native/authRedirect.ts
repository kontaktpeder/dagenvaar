import { isNativePlatform } from './platform';

/**
 * Redirect URL for Supabase auth flows (signup confirmation, password reset, OAuth).
 * - Native: custom URL scheme handled by @capacitor/app deep links
 * - Web: current origin + /auth/callback
 */
export function getAuthRedirectUrl(): string {
  if (isNativePlatform()) {
    return 'pastelly://auth/callback';
  }
  return `${window.location.origin}/auth/callback`;
}
