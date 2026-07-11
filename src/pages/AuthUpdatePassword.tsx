import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { logAuthDiagnostic } from '@/lib/auth/diagnostics';
import {
  clearRecoveryFlow,
  getRecoveryState,
  markRecoverySessionReady,
  startRecoveryFlow,
  subscribeRecoveryState,
} from '@/lib/auth/recoveryState';

type PageState = 'checking' | 'ready' | 'submitting' | 'success' | 'error';

// How long we wait for a session / PASSWORD_RECOVERY event before giving up
// with a proper error state. Never an infinite spinner.
const SESSION_TIMEOUT_MS = 5000;

const AuthUpdatePassword = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<PageState>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let disposed = false;
    logAuthDiagnostic('recovery:page:checking');

    // If we landed here directly, assume an in-progress recovery flow so the
    // page renders stably while Supabase finishes hydrating the session.
    if (!getRecoveryState().isRecoveryFlow) {
      startRecoveryFlow();
    }

    const promote = () => {
      if (disposed) return;
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      markRecoverySessionReady();
      setState((prev) => (prev === 'checking' ? 'ready' : prev));
      logAuthDiagnostic('recovery:page:ready');
    };

    // 1. Existing session (exchange finished before we mounted)
    supabase.auth.getSession().then(({ data }) => {
      if (disposed) return;
      if (data.session) promote();
    });

    // 2. Live auth events — both PASSWORD_RECOVERY and SIGNED_IN indicate
    //    we have a usable session for updateUser({ password }).
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (disposed) return;
      if (event === 'PASSWORD_RECOVERY') {
        startRecoveryFlow();
        promote();
        return;
      }
      if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
        promote();
      }
    });

    // 3. Timeout — surface a clear error instead of flashing spinners.
    timeoutRef.current = window.setTimeout(() => {
      if (disposed) return;
      setState((prev) => {
        if (prev !== 'checking') return prev;
        setError('Vi klarte ikke å bekrefte gjenopprettingslenken. Be om en ny e-post og prøv igjen.');
        logAuthDiagnostic('recovery:page:timeout');
        return 'error';
      });
    }, SESSION_TIMEOUT_MS);

    return () => {
      disposed = true;
      sub.subscription.unsubscribe();
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  // Reflect external recovery-state changes (rare, but keeps the flow honest).
  useEffect(() => {
    return subscribeRecoveryState(() => {
      /* no-op: state is already driven by auth events. */
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Passord må være minst 6 tegn');
      return;
    }
    if (password !== confirm) {
      setError('Passordene er ikke like');
      return;
    }
    setState('submitting');
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setState('ready');
      logAuthDiagnostic('recovery:page:error');
      return;
    }
    setState('success');
    clearRecoveryFlow();
    // Small delay so the success state is visible before navigating.
    window.setTimeout(() => navigate('/', { replace: true }), 600);
  };

  const handleBack = () => {
    clearRecoveryFlow();
    navigate('/', { replace: true });
  };

  if (state === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Klargjør gjenoppretting...</p>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-background">
        <div className="w-full max-w-sm text-center">
          <p className="text-5xl mb-4">🔒</p>
          <h1 className="text-2xl font-bold mb-2">Lenken er ugyldig</h1>
          <p className="text-muted-foreground mb-6">{error || 'Denne siden krever en gyldig gjenopprettingslenke.'}</p>
          <button
            onClick={handleBack}
            className="rounded-xl bg-green-200 px-4 py-2 font-semibold text-green-900"
          >
            Tilbake
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center mb-2">Nytt passord 🔑</h1>
        <p className="text-muted-foreground text-center mb-8">Velg et nytt passord for kontoen din</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nytt passord"
            required
            minLength={6}
            autoComplete="new-password"
            disabled={state === 'submitting' || state === 'success'}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Bekreft passord"
            required
            minLength={6}
            autoComplete="new-password"
            disabled={state === 'submitting' || state === 'success'}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
          />
          {error && <p className="text-destructive text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={state === 'submitting' || state === 'success'}
            className="w-full rounded-xl bg-green-200 py-3 font-semibold text-green-900 transition-colors hover:bg-green-300 disabled:opacity-60"
          >
            {state === 'submitting' ? 'Lagrer...' : state === 'success' ? 'Ferdig ✓' : 'Lagre nytt passord'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default AuthUpdatePassword;
