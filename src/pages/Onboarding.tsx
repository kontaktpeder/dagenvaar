import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { COLOR_TOKEN_OPTIONS } from '@/lib/colors';

interface OnboardingPageProps {
  onComplete: () => void;
}

const colorMap: Record<string, string> = {
  'pastel-blue': 'bg-member-blue',
  'pastel-peach': 'bg-member-peach',
  'pastel-lavender': 'bg-member-lavender',
  'pastel-mint': 'bg-member-mint',
  'pastel-rose': 'bg-member-rose',
  'pastel-yellow': 'bg-member-yellow',
};

type Mode = 'create' | 'join';

const OnboardingPage = ({ onComplete }: OnboardingPageProps) => {
  const [mode, setMode] = useState<Mode>('create');
  const [displayName, setDisplayName] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [colorToken, setColorToken] = useState('pastel-blue');
  const [error, setError] = useState('');

  const createHousehold = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('create_household_with_owner', {
        p_name: householdName || 'Vårt hjem',
        p_display_name: displayName || 'Meg',
        p_color_token: colorToken,
      });
      if (error) throw error;
    },
    onSuccess: onComplete,
  });

  const joinHousehold = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('join_household_by_code', {
        p_invite_code: inviteCode.trim(),
        p_display_name: displayName || 'Meg',
        p_color_token: colorToken,
      });
      if (error) throw error;
    },
    onSuccess: onComplete,
  });

  const isPending = createHousehold.isPending || joinHousehold.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'create') {
        await createHousehold.mutateAsync();
      } else {
        if (!inviteCode.trim()) {
          setError('Skriv inn invitasjonskoden');
          return;
        }
        await joinHousehold.mutateAsync();
      }
    } catch (err: any) {
      setError(err.message || 'Noe gikk galt');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center mb-2">Velkommen! 🏡</h1>
        <p className="text-muted-foreground text-center mb-6">La oss sette opp hjemmet ditt</p>

        {/* Mode toggle */}
        <div className="flex rounded-xl bg-muted p-1 mb-6">
          <button type="button" onClick={() => { setMode('create'); setError(''); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === 'create' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>
            Opprett hjem
          </button>
          <button type="button" onClick={() => { setMode('join'); setError(''); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === 'join' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>
            Jeg har kode
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-sm font-medium mb-2 block">Hva heter du?</label>
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              placeholder="F.eks. Peder"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          {mode === 'create' ? (
            <div>
              <label className="text-sm font-medium mb-2 block">Navn på hjemmet</label>
              <input type="text" value={householdName} onChange={(e) => setHouseholdName(e.target.value)}
                placeholder="Vårt hjem"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium mb-2 block">Invitasjonskode</label>
              <input type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="F.eks. AB12-CD34"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-3 block">Velg din farge</label>
            <div className="flex gap-3 justify-center">
              {COLOR_TOKEN_OPTIONS.map((token) => (
                <button key={token} type="button" onClick={() => setColorToken(token)}
                  className={`w-12 h-12 rounded-full ${colorMap[token]} transition-all ${
                    colorToken === token ? 'ring-2 ring-foreground ring-offset-2 scale-110' : 'hover:scale-105'
                  }`} />
              ))}
            </div>
          </div>

          {error && <p className="text-destructive text-sm text-center">{error}</p>}

          <button type="submit" disabled={isPending}
            className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50">
            {isPending
              ? (mode === 'create' ? 'Oppretter...' : 'Kobler til...')
              : (mode === 'create' ? 'Kom i gang ✨' : 'Bli med 🎉')}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default OnboardingPage;
