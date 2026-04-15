import { useState } from 'react';
import { motion } from 'framer-motion';
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
        className="relative mt-auto bg-background rounded-t-3xl max-h-[70vh]"
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
