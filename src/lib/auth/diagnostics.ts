/**
 * Dev-only auth diagnostics. No secrets, no tokens, no full URLs.
 * Emits are gated by `import.meta.env.DEV`.
 */
import { isNativePlatform, isIOS, isAndroid } from '@/lib/native/platform';

type DiagnosticEvent =
  | 'native:init:ok'
  | 'native:init:fail'
  | 'deeplinks:init:once'
  | 'deeplinks:cold_start'
  | 'deeplinks:warm_open'
  | 'callback:received'
  | 'callback:invalid_url'
  | 'callback:exchange_ok'
  | 'callback:exchange_error'
  | 'callback:set_session_ok'
  | 'callback:set_session_error'
  | 'callback:dedup_code'
  | 'callback:dedup_token'
  | 'callback:no_params'
  | 'recovery:event'
  | 'recovery:navigate'
  | 'recovery:page:checking'
  | 'recovery:page:ready'
  | 'recovery:page:error'
  | 'recovery:page:timeout';

function currentPlatform(): 'ios' | 'android' | 'web' {
  if (isIOS()) return 'ios';
  if (isAndroid()) return 'android';
  return 'web';
}

export function logAuthDiagnostic(
  event: DiagnosticEvent,
  data?: Record<string, string | number | boolean | undefined>,
): void {
  if (!import.meta.env.DEV) return;
  const payload = {
    platform: currentPlatform(),
    native: isNativePlatform(),
    ...(data ?? {}),
  };
  // eslint-disable-next-line no-console
  console.info(`[auth] ${event}`, payload);
}
