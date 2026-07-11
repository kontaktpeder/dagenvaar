import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

const AuthUpdatePassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setChecking(false);
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
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate('/', { replace: true });
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-background">
        <div className="w-full max-w-sm text-center">
          <p className="text-5xl mb-4">🔒</p>
          <h1 className="text-2xl font-bold mb-2">Lenken er ugyldig</h1>
          <p className="text-muted-foreground mb-6">
            Denne siden krever en gyldig gjenopprettingslenke. Be om en ny e-post og prøv igjen.
          </p>
          <button
            onClick={() => navigate('/', { replace: true })}
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
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Bekreft passord"
            required
            minLength={6}
            autoComplete="new-password"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {error && <p className="text-destructive text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-green-200 py-3 font-semibold text-green-900 transition-colors hover:bg-green-300 disabled:opacity-60"
          >
            {saving ? 'Lagrer...' : 'Lagre nytt passord'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default AuthUpdatePassword;
