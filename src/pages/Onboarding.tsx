import { useState } from 'react';
import { scrollFocusIntoView } from '@/lib/scrollFocusIntoView';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { COLOR_TOKEN_OPTIONS } from '@/lib/colors';
import {
  CALENDAR_KINDS,
  defaultShowInOtherCalendars,
  type CalendarKind,
} from '@/lib/calendarKinds';
import { setStoredActiveHouseholdId } from '@/lib/activeHousehold';
import KeyboardAwareScreen from '@/components/KeyboardAwareScreen';

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
  const [kind, setKind] = useState<CalendarKind>('home');
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [colorToken, setColorToken] = useState('pastel-blue');
  const [error, setError] = useState('');

  const kindMeta = CALENDAR_KINDS.find((k) => k.value === kind)!;

  const createHousehold = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('create_household_with_owner', {
        p_name: householdName || kindMeta.defaultName,
        p_display_name: displayName || 'Meg',
        p_color_token: colorToken,
        p_kind: kind,
        p_show_in_other_calendars: defaultShowInOtherCalendars(kind),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.id) setStoredActiveHouseholdId(data.id);
      onComplete();
    },
  });

  const joinHousehold = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('join_household_by_code', {
        p_invite_code: inviteCode.trim(),
        p_display_name: displayName || 'Meg',
        p_color_token: colorToken,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (householdId) => {
      if (householdId) setStoredActiveHouseholdId(householdId);
      onComplete();
    },
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
    <KeyboardAwareScreen
      asForm
      onSubmit={handleSubmit}
      contentClassName="pb-6"
      footer={
        <button type="submit" disabled={isPending}
          className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-colors active:opacity-90 disabled:opacity-50">
          {isPending
            ? (mode === 'create' ? 'Oppretter...' : 'Kobler til...')
            : (mode === 'create' ? 'Kom i gang ✨' : 'Bli med 🎉')}
        </button>
      }
    >
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2">Velkommen! 🏡</h1>
        <p className="text-muted-foreground text-center mb-6">La oss sette opp din første kalender</p>

        <div className="flex rounded-xl bg-muted p-1 mb-6">
          <button type="button" onClick={() => { setMode('create'); setError(''); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === 'create' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>
            Opprett
          </button>
          <button type="button" onClick={() => { setMode('join'); setError(''); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === 'join' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>
            Jeg har kode
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium mb-2 block">Hva heter du?</label>
            <input type="text" onFocus={scrollFocusIntoView} value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              placeholder="F.eks. Peder"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>

          {mode === 'create' ? (
            <>
              <div>
                <label className="text-sm font-medium mb-2 block">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {CALENDAR_KINDS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setKind(opt.value);
                        if (!householdName || CALENDAR_KINDS.some((k) => k.defaultName === householdName)) {
                          setHouseholdName(opt.defaultName);
                        }
                      }}
                      className={`rounded-xl p-3 text-left transition-all ${
                        kind === opt.value
                          ? 'bg-primary/20 ring-2 ring-primary'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      <p className="font-semibold text-sm">{opt.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Navn på {kind === 'work' ? 'jobbkalenderen' : 'hjemmet'}
                </label>
                <input type="text" onFocus={scrollFocusIntoView} value={householdName} onChange={(e) => setHouseholdName(e.target.value)}
                  placeholder={kindMeta.defaultName}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </>
          ) : (
            <div>
              <label className="text-sm font-medium mb-2 block">Invitasjonskode</label>
              <input type="text" onFocus={scrollFocusIntoView} value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
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
        </div>
      </motion.div>
    </KeyboardAwareScreen>
  );
};

export default OnboardingPage;
