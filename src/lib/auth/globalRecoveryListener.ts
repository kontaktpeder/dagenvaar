/**
 * Module-level PASSWORD_RECOVERY listener.
 *
 * Installed once at app entry (main.tsx) BEFORE native deep-link handling
 * kicks off, so the `PASSWORD_RECOVERY` event fired by Supabase after a
 * recovery-code exchange is never missed — even if RecoveryRouter has not
 * mounted yet.
 *
 * This listener does NOT navigate. It only records recovery state; the
 * RecoveryRouter (once mounted) and Index redirect are responsible for
 * routing the user to /auth/update-password.
 */
import { supabase } from '@/integrations/supabase/client';
import { logAuthDiagnostic } from './diagnostics';
import { markRecoverySessionReady, startRecoveryFlow } from './recoveryState';

let installed = false;

export function installGlobalRecoveryListener(): void {
  if (installed) return;
  installed = true;
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      logAuthDiagnostic('recovery:event', { source: 'global' });
      startRecoveryFlow();
      markRecoverySessionReady();
    }
  });
}
