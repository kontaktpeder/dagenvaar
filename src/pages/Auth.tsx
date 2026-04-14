import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useCreateHousehold } from '@/hooks/useHousehold';
import { COLOR_TOKEN_OPTIONS } from '@/lib/colors';

const AuthPage = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [confirmationSent, setConfirmationSent] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) setError(error.message);
    } else {
      const { error } = await signUp(email, password);
      if (error) setError(error.message);
      else setConfirmationSent(true);
    }
  };

  if (confirmationSent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-background">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm text-center">
          <p className="text-5xl mb-4">📬</p>
          <h1 className="text-2xl font-bold mb-2">Sjekk e-posten din!</h1>
          <p className="text-muted-foreground mb-6">
            Vi har sendt en bekreftelseslenke til <strong>{email}</strong>. Klikk på lenken for å aktivere kontoen din.
          </p>
          <button
            onClick={() => { setConfirmationSent(false); setMode('login'); }}
            className="text-foreground font-medium underline underline-offset-2"
          >
            Gå til innlogging
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center mb-2">
          {mode === 'login' ? 'Hei igjen 👋' : 'Lag konto ✨'}
        </h1>
        <p className="text-muted-foreground text-center mb-8">
          {mode === 'login' ? 'Logg inn for å se kalenderen' : 'Opprett konto for å komme i gang'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="E-post" required
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Passord" required minLength={6}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
          />

          {error && <p className="text-destructive text-sm text-center">{error}</p>}

          <button type="submit" className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-colors hover:opacity-90">
            {mode === 'login' ? 'Logg inn' : 'Opprett konto'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-muted-foreground">
          {mode === 'login' ? 'Har du ikke konto?' : 'Har du allerede konto?'}{' '}
          <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
            className="text-foreground font-medium underline underline-offset-2">
            {mode === 'login' ? 'Opprett konto' : 'Logg inn'}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default AuthPage;
