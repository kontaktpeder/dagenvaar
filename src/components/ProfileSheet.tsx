import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getMemberColor } from '@/lib/colors';
import type { HouseholdMember, Household } from '@/hooks/useHousehold';
import { Camera } from 'lucide-react';
import AvatarCropModal from '@/components/AvatarCropModal';

interface ProfileSheetProps {
  household: Household;
  members: HouseholdMember[];
  currentMember: HouseholdMember;
  onClose: () => void;
  onSignOut: () => Promise<void>;
}

const MemberAvatar = ({ member, size = 'md' }: { member: HouseholdMember; size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = { sm: 'w-10 h-10 text-sm', md: 'w-16 h-16 text-2xl', lg: 'w-20 h-20 text-3xl' };
  const color = getMemberColor(member.color_token);

  if (member.avatar_url) {
    return (
      <img
        src={member.avatar_url}
        alt={member.display_name}
        className={`${sizeClasses[size]} rounded-full object-cover`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold ${color.bg}`}
    >
      {member.display_name.charAt(0)}
    </div>
  );
};

const ProfileSheet = ({ household, members, currentMember, onClose, onSignOut }: ProfileSheetProps) => {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteExpiry, setInviteExpiry] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const uploadAvatar = useMutation({
    mutationFn: async (blob: Blob) => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error('Ikke innlogget');

      const filePath = `${userId}/avatar.jpg`;

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, { upsert: true, contentType: 'image/jpeg' });
      if (uploadErr) throw uploadErr;

      const { data: publicData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrl = `${publicData.publicUrl}?t=${Date.now()}`;

      const { error: updateErr } = await supabase
        .from('household_members')
        .update({ avatar_url: avatarUrl })
        .eq('id', currentMember.id);
      if (updateErr) throw updateErr;

      return avatarUrl;
    },
    onSuccess: () => {
      setUploadError('');
      setCropImageSrc(null);
      queryClient.invalidateQueries({ queryKey: ['current-household-context'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
    onError: (err: any) => {
      setUploadError(err?.message ?? 'Kunne ikke laste opp bilde');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setUploadError('Filen må være et bilde');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('Maks 10 MB');
        return;
      }
      setUploadError('');
      const reader = new FileReader();
      reader.onload = () => setCropImageSrc(reader.result as string);
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleCropDone = (blob: Blob) => {
    setCropImageSrc(null);
    uploadAvatar.mutate(blob);
  };

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
          {/* Profile with avatar upload */}
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-3">
              <MemberAvatar member={currentMember} size="md" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadAvatar.isPending}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md transition-transform hover:scale-110 disabled:opacity-50"
              >
                {uploadAvatar.isPending ? (
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                ) : (
                  <Camera size={14} strokeWidth={2.5} />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            {uploadError && (
              <p className="text-destructive text-xs mb-2">{uploadError}</p>
            )}
            <h2 className="text-xl font-bold">{currentMember.display_name}</h2>
            <p className="text-sm text-muted-foreground">{household.name}</p>
          </div>

          {/* Members */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Medlemmer</h3>
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-xl bg-muted p-3">
                  <MemberAvatar member={m} size="sm" />
                  <div>
                    <p className="font-medium text-sm">{m.display_name}</p>
                    <p className="text-xs text-muted-foreground">{m.role === 'owner' ? 'Eier' : 'Medlem'}</p>
                  </div>
                </div>
              ))}
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
