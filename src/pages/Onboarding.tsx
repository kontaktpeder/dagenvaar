import { useState } from 'react';
import { motion } from 'framer-motion';
import { useCreateHousehold } from '@/hooks/useHousehold';
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

const OnboardingPage = ({ onComplete }: OnboardingPageProps) => {
  const [displayName, setDisplayName] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [colorToken, setColorToken] = useState('pastel-blue');
  const [error, setError] = useState('');
  const createHousehold = useCreateHousehold();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await createHousehold.mutateAsync({
        name: householdName || 'Vårt hjem',
        displayName: displayName || 'Meg',
        colorToken,
      });
      onComplete();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center mb-2">Velkommen! 🏡</h1>
        <p className="text-muted-foreground text-center mb-8">La oss sette opp hjemmet ditt</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-sm font-medium mb-2 block">Hva heter du?</label>
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              placeholder="F.eks. Peder"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Navn på hjemmet</label>
            <input type="text" value={householdName} onChange={(e) => setHouseholdName(e.target.value)}
              placeholder="Vårt hjem"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

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

          <button type="submit" disabled={createHousehold.isPending}
            className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50">
            {createHousehold.isPending ? 'Oppretter...' : 'Kom i gang ✨'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default OnboardingPage;
