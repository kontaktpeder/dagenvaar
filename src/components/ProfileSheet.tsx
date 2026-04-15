import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getMemberColor } from '@/lib/colors';
import type { HouseholdMember, Household } from '@/hooks/useHousehold';

interface ProfileSheetProps {
  household: Household;
  members: HouseholdMember[];
  currentMember: HouseholdMember;
  onClose: () => void;
  onSignOut: () => Promise<void>;
}

const ProfileSheet = ({ household, members, currentMember, onClose, onSignOut }: ProfileSheetProps) => {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteExpiry, setInviteExpiry] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');

  const joinHousehold = useMutation({
    mutationFn: async () => {
      const code = joinCode.trim().toUpperCase();
      if (!code) throw new Error('Skriv inn invitasjonskoden');
      const { error } = await supabase.rpc('join_household_by_code', {
        p_invite_code: code,
        p_display_name: currentMember.display_name || 'Meg',
        p_color_token: currentMember.color_token || 'pastel-blue',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setJoinError('');
      setJoinCode('');
      onClose();
      window.location.reload();
    },
    onError: (err: any) => {
      setJoinError(err?.message ?? 'Kunne ikke bli med via kode');
    },
  });

  const createInvite = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('create_household_invite');
      if (error) throw error;
      return data?.[0] ?? null;
    },
    onSuccess: (data) => {
      if (data) {
        setInviteCode(data.code);
        setInviteExpiry(data.expires_at);
      }
    },
  });

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleSignOutClick = async () => {
    setSignOutError('');
    setIsSigningOut(true);
    try {
      await onSignOut();
    } catch (err: any) {
      setSignOutError(err?.message ?? 'Kunne ikke logge ut');
    } finally {
      setIsSigningOut(false);
    }
  };

  const isOwner = currentMember.role === 'owner';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col"
    >
      <div className="absolute inset-0 bg-foreground/20" onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative mt-auto bg-background rounded-t-3xl max-h-[70vh] overflow-y-auto"
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        <div className="px-5 pb-8 space-y-6">
          {/* Profile */}
          <div className="text-center">
            <div
              className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl font-bold`}
              style={{ backgroundColor: `hsl(var(--member-${currentMember.color_token.replace('pastel-', '')}))` }}
            >
              {currentMember.display_name.charAt(0)}
            </div>
            <h2 className="text-xl font-bold">{currentMember.display_name}</h2>
            <p className="text-sm text-muted-foreground">{household.name}</p>
          </div>

          {/* Members */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Medlemmer</h3>
            <div className="space-y-2">
              {members.map((m) => {
                const color = getMemberColor(m.color_token);
                return (
                  <div key={m.id} className="flex items-center gap-3 rounded-xl bg-muted p-3">
                    <div className={`w-10 h-10 rounded-full ${color.bg} flex items-center justify-center font-bold text-sm`}>
                      {m.display_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{m.display_name}</p>
                      <p className="text-xs text-muted-foreground">{m.role === 'owner' ? 'Eier' : 'Medlem'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Invite */}
          {isOwner && (
            <div className="space-y-2">
              {!inviteCode ? (
                <button
                  onClick={() => createInvite.mutate()}
                  disabled={createInvite.isPending}
                  className="w-full rounded-xl bg-calendar-accent/60 py-3 text-sm font-medium transition-colors hover:bg-calendar-accent/80 disabled:opacity-50"
                >
                  {createInvite.isPending ? 'Oppretter...' : 'Inviter medlem'}
                </button>
              ) : (
                <div className="rounded-xl bg-muted p-4 space-y-3">
                  <p className="text-sm font-medium text-center">Invitasjonskode</p>
                  <p className="text-2xl font-bold text-center tracking-widest">{inviteCode}</p>
                  {inviteExpiry && (
                    <p className="text-xs text-muted-foreground text-center">
                      Utløper {new Date(inviteExpiry).toLocaleDateString('nb-NO')}
                    </p>
                  )}
                  <button
                    onClick={handleCopyCode}
                    className="w-full rounded-xl bg-calendar-accent/60 py-2.5 text-sm font-medium transition-colors hover:bg-calendar-accent/80"
                  >
                    {copied ? '✓ Kopiert!' : 'Kopier kode'}
                  </button>
                </div>
              )}
              {createInvite.isError && (
                <p className="text-destructive text-sm text-center">
                  {(createInvite.error as any)?.message || 'Kunne ikke opprette invitasjon'}
                </p>
              )}
            </div>
          )}

          {/* Join by code */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Jeg har kode</h3>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="F.eks. AB12-CD34"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={() => { setJoinError(''); joinHousehold.mutate(); }}
              disabled={joinHousehold.isPending}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {joinHousehold.isPending ? 'Kobler til...' : 'Bli med med kode'}
            </button>
            {joinError && (
              <p className="text-destructive text-sm text-center">{joinError}</p>
            )}
          </div>

          {/* Sign out */}
          <div className="space-y-2">
            <button
              onClick={handleSignOutClick}
              disabled={isSigningOut}
              className="w-full rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSigningOut ? 'Logger ut...' : 'Logg ut'}
            </button>
            {signOutError && (
              <p className="text-destructive text-sm text-center">{signOutError}</p>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ProfileSheet;
