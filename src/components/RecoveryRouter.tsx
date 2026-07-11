import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { logAuthDiagnostic } from '@/lib/auth/diagnostics';
import {
  getRecoveryState,
  markRecoverySessionReady,
  startRecoveryFlow,
} from '@/lib/auth/recoveryState';

const TARGET_PATH = '/auth/update-password';

/**
 * Single global owner of navigation into the password-recovery page.
 *
 * Triggers:
 * - Supabase `PASSWORD_RECOVERY` auth event (authoritative — fires reliably
 *   after `exchangeCodeForSession` on a recovery link, even when the URL
 *   only carried `?code=` without `type=recovery`).
 * - Existing persisted recovery state on mount (e.g. after a WebView reload
 *   during the recovery flow).
 *
 * Idempotent — never navigates if we're already on the target path.
 * Never navigates AWAY from the target path.
 */
export default function RecoveryRouter() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const goToUpdatePassword = () => {
      if (window.location.pathname === TARGET_PATH) return;
      logAuthDiagnostic('recovery:navigate');
      navigate(TARGET_PATH, { replace: true });
    };

    // Rehydrate on mount — if we reloaded mid-flow, get back to the page.
    const existing = getRecoveryState();
    if (existing.isRecoveryFlow) {
      goToUpdatePassword();
    }

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        logAuthDiagnostic('recovery:event');
        startRecoveryFlow();
        markRecoverySessionReady();
        goToUpdatePassword();
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
    // navigate is stable; location intentionally omitted so we don't re-run
    // on every route change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ensure we don't remain on the update-password page after the flow ends
  // (state cleared elsewhere). This effect is a no-op unless a stale route
  // is somehow left behind — kept minimal on purpose.
  useEffect(() => {
    if (location.pathname === TARGET_PATH) {
      const state = getRecoveryState();
      if (!state.isRecoveryFlow) {
        // Someone landed here without an active recovery flow — leave it
        // to the page itself to render its "invalid link" UI. Do nothing.
      }
    }
  }, [location.pathname]);

  return null;
}
