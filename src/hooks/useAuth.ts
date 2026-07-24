import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getAuthRedirectUrl } from '@/lib/native/authRedirect';
import { clearPendingRecoveryIntent } from '@/lib/auth/recoveryState';
import { setSessionNotice } from '@/lib/auth/sessionNotice';
import { clearStoredActiveHouseholdId } from '@/lib/activeHousehold';
import { clearPushUser, identifyPushUser } from '@/lib/native/push';
import type { User, Session } from '@supabase/supabase-js';

async function clearInvalidSession(): Promise<void> {
  setSessionNotice('account_unavailable');
  clearPendingRecoveryIntent();
  clearStoredActiveHouseholdId();
  await clearPushUser();
  await supabase.auth.signOut({ scope: 'local' });
}

/** Server-roundtrip check: local JWT may outlive a deleted auth.users row. */
async function sessionUserStillExists(): Promise<boolean> {
  const { data, error } = await supabase.auth.getUser();
  return !error && !!data.user;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const validatingRef = useRef(false);

  useEffect(() => {
    const applySession = (next: Session | null) => {
      setSession(next);
      setUser(next?.user ?? null);
      setLoading(false);
      if (next?.user?.id) {
        void identifyPushUser(next.user.id);
      } else {
        void clearPushUser();
      }
    };

    const validateExistingSession = async (next: Session) => {
      if (validatingRef.current) return;
      validatingRef.current = true;
      try {
        const ok = await sessionUserStillExists();
        if (!ok) {
          await clearInvalidSession();
          applySession(null);
          return;
        }
        applySession(next);
      } finally {
        validatingRef.current = false;
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        if (event === 'SIGNED_OUT' || !nextSession) {
          applySession(null);
          return;
        }
        // INITIAL_SESSION / SIGNED_IN: confirm the user still exists server-side.
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          void validateExistingSession(nextSession);
          return;
        }
        applySession(nextSession);
      },
    );

    supabase.auth.getSession().then(({ data: { session: next } }) => {
      if (!next) {
        applySession(null);
        return;
      }
      void validateExistingSession(next);
    });

    const revalidateOnResume = () => {
      if (document.visibilityState !== 'visible') return;
      void (async () => {
        const { data: { session: current } } = await supabase.auth.getSession();
        if (!current) return;
        const ok = await sessionUserStillExists();
        if (!ok) {
          await clearInvalidSession();
          applySession(null);
        }
      })();
    };
    document.addEventListener('visibilitychange', revalidateOnResume);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', revalidateOnResume);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: getAuthRedirectUrl() },
    });
    return { error };
  };

  const signOut = async () => {
    clearPendingRecoveryIntent();
    clearStoredActiveHouseholdId();
    await clearPushUser();
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
  };

  return { user, session, loading, signIn, signUp, signOut };
}
