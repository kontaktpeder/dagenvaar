import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { requestPasswordReset } from '@/lib/auth/requestPasswordReset';
import { scrollFocusIntoView } from '@/lib/scrollFocusIntoView';

type Mode = 'login' | 'signup' | 'forgot';

const AuthPage = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) setError(error.message);
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password);
        if (error) setError(error.message);
        else setConfirmationSent(true);
      } else {
        const result = await requestPasswordReset(email);
        if (result.ok === true) {
          setResetSent(true);
        } else {
          setError(result.error.message);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setConfirmationSent(false);
    setResetSent(false);
  };

  if (confirmationSent) {
    return (
      <div className="min-h-[100dvh] overflow-y-auto py-safe px-6 bg-background flex items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm text-center">
          <p className="text-5xl mb-4">📬</p>
          <h1 className="text-2xl font-bold mb-2">Sjekk e-posten din!</h1>
          <p className="text-muted-foreground mb-6">
            Vi har sendt en bekreftelseslenke til <strong>{email}</strong>. Klikk på lenken for å aktivere kontoen din.
          </p>
          <button
            onClick={() => switchMode('login')}
            className="text-foreground font-medium underline underline-offset-2"
          >
            Gå til innlogging
          </button>
        </motion.div>
      </div>
    );
  }

  if (resetSent) {
    return (
      <div className="min-h-[100dvh] overflow-y-auto py-safe px-6 bg-background flex items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm text-center">
          <p className="text-5xl mb-4">📮</p>
          <h1 className="text-2xl font-bold mb-2">Sjekk e-posten din</h1>
          <p className="text-muted-foreground mb-6">
            Vi har sendt en lenke til e-posten din. Sjekk også søppelpost.
          </p>
          <button
            onClick={() => switchMode('login')}
            className="text-foreground font-medium underline underline-offset-2"
          >
            Tilbake til innlogging
          </button>
        </motion.div>
      </div>
    );
  }

  const title =
    mode === 'login' ? 'Hei igjen 👋' : mode === 'signup' ? 'Lag konto ✨' : 'Glemt passord?';
  const subtitle =
    mode === 'login'
      ? 'Logg inn for å se kalenderen'
      : mode === 'signup'
      ? 'Opprett konto for å komme i gang'
      : 'Skriv inn e-posten din, så sender vi en lenke';

  const submitLabel =
    mode === 'login' ? 'Logg inn' : mode === 'signup' ? 'Opprett konto' : 'Send lenke';

  return (
    <div className="min-h-[100dvh] overflow-y-auto py-safe px-6 bg-background flex items-center justify-center">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center mb-2">{title}</h1>
        <p className="text-muted-foreground text-center mb-8">{subtitle}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="E-post" required autoComplete="email" onFocus={scrollFocusIntoView}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {mode !== 'forgot' && (
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Passord" required minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'} onFocus={scrollFocusIntoView}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
            />
          )}

          {error && <p className="text-destructive text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-green-200 py-3 font-semibold text-green-900 transition-colors hover:bg-green-300 disabled:opacity-60"
          >
            {busy ? 'Sender...' : submitLabel}
          </button>
        </form>

        {mode === 'login' && (
          <p className="text-center mt-4 text-sm">
            <button onClick={() => switchMode('forgot')} className="text-muted-foreground underline underline-offset-2">
              Glemt passord?
            </button>
          </p>
        )}

        <p className="text-center mt-6 text-sm text-muted-foreground">
          {mode === 'signup' ? (
            <>Har du allerede konto?{' '}
              <button onClick={() => switchMode('login')} className="text-foreground font-medium underline underline-offset-2">Logg inn</button>
            </>
          ) : mode === 'forgot' ? (
            <button onClick={() => switchMode('login')} className="text-foreground font-medium underline underline-offset-2">Tilbake til innlogging</button>
          ) : (
            <>Har du ikke konto?{' '}
              <button onClick={() => switchMode('signup')} className="text-foreground font-medium underline underline-offset-2">Opprett konto</button>
            </>
          )}
        </p>
      </motion.div>
    </div>
  );
};

export default AuthPage;
