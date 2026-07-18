import { useState, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getMemberColor } from '@/lib/colors';
import type { HouseholdMember, Household } from '@/hooks/useHousehold';
import { Camera, ChevronDown } from 'lucide-react';
import AvatarCropModal from '@/components/AvatarCropModal';
import CategoryColorSettings from '@/components/CategoryColorSettings';
import DailyDigestSettings from '@/components/DailyDigestSettings';
import CenteredPopup from '@/components/CenteredPopup';

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

/** Collapsible folder section inside profile — full-width, no nested “mini card” */
const ProfileFolder = ({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) => (
  <div className="shrink-0 border-b border-border/60 last:border-b-0">
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between gap-3 px-1 py-4 text-left"
      aria-expanded={open}
    >
      <span className="text-base font-semibold">{title}</span>
      <ChevronDown
        size={20}
        strokeWidth={2.25}
        className={`text-muted-foreground shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      />
    </button>
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="body"
          initial={{ height: 0 }}
          animate={{ height: 'auto' }}
          exit={{ height: 0 }}
          transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
          className="overflow-hidden"
        >
          <div className="pb-5 pt-0 space-y-3">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

type FolderKey = 'hjem' | 'innstillinger' | 'konto';

const ProfileSheet = ({ household, members, currentMember, onClose, onSignOut }: ProfileSheetProps) => {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteExpiry, setInviteExpiry] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaveError, setLeaveError] = useState('');
  const [openFolders, setOpenFolders] = useState<Record<FolderKey, boolean>>({
    hjem: true,
    innstillinger: false,
    konto: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const toggleFolder = (key: FolderKey) => {
    setOpenFolders((prev) => {
      const nextOpen = !prev[key];
      // One folder open at a time — keeps the sheet readable
      return {
        hjem: false,
        innstillinger: false,
        konto: false,
        [key]: nextOpen,
      };
    });
  };

  const leaveHousehold = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('leave_household');
      if (error) throw error;
    },
    onSuccess: async () => {
      setLeaveError('');
      setShowLeaveConfirm(false);
      await queryClient.invalidateQueries();
      onClose();
    },
    onError: (err: any) => {
      setLeaveError(err?.message ?? 'Kunne ikke forlate hjemmet');
    },
  });

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
    onSuccess: async () => {
      setJoinError('');
      setJoinCode('');
      setShowJoin(false);
      await queryClient.invalidateQueries();
      onClose();
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
    <CenteredPopup onClose={onClose} onExit={onClose} size="sheet" zClassName="z-[60]">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain scroll-touch px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 pr-14 touch-pan-y">
          {/* Deg — always visible header */}
          <section className="shrink-0 text-center pb-4 border-b border-border/60 mb-1">
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
        </section>

        <ProfileFolder title="Hjem" open={openFolders.hjem} onToggle={() => toggleFolder('hjem')}>
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

          {isOwner && (
            <div className="space-y-2 pt-1">
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
                    {copied ? 'Kopiert' : 'Kopier kode'}
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
        </ProfileFolder>

        <ProfileFolder
          title="Innstillinger"
          open={openFolders.innstillinger}
          onToggle={() => toggleFolder('innstillinger')}
        >
          <DailyDigestSettings member={currentMember} />
          <CategoryColorSettings member={currentMember} />
        </ProfileFolder>

        <ProfileFolder title="Konto" open={openFolders.konto} onToggle={() => toggleFolder('konto')}>
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

          {!showJoin ? (
            <button
              type="button"
              onClick={() => { setShowJoin(true); setJoinError(''); }}
              className="w-full rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Bli med i et annet hjem
            </button>
          ) : (
            <div className="rounded-xl bg-muted p-4 space-y-3">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="F.eks. AB12-CD34"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setShowJoin(false); setJoinCode(''); setJoinError(''); }}
                  className="rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-background transition-colors"
                >
                  Avbryt
                </button>
                <button
                  type="button"
                  onClick={() => { setJoinError(''); joinHousehold.mutate(); }}
                  disabled={joinHousehold.isPending}
                  className="rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {joinHousehold.isPending ? 'Kobler til...' : 'Bli med'}
                </button>
              </div>
              {joinError && (
                <p className="text-destructive text-sm text-center">{joinError}</p>
              )}
            </div>
          )}

          {!showLeaveConfirm ? (
            <button
              onClick={() => { setLeaveError(''); setShowLeaveConfirm(true); }}
              className="w-full rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Forlat hjemmet
            </button>
          ) : (
            <div className="rounded-xl bg-muted p-4 space-y-3">
              <p className="text-sm font-medium text-center">
                Er du sikker på at du vil forlate «{household.name}»?
              </p>
              <p className="text-xs text-muted-foreground text-center">
                {members.length <= 1
                  ? 'Du er eneste medlem – hjemmet og alt innhold blir slettet.'
                  : currentMember.role === 'owner'
                  ? 'Du er eier. Eierskapet overføres til et annet medlem.'
                  : 'Du mister tilgang til hendelser og lister i dette hjemmet.'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setShowLeaveConfirm(false); setLeaveError(''); }}
                  disabled={leaveHousehold.isPending}
                  className="rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-background transition-colors disabled:opacity-50"
                >
                  Avbryt
                </button>
                <button
                  onClick={() => leaveHousehold.mutate()}
                  disabled={leaveHousehold.isPending}
                  className="rounded-xl bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {leaveHousehold.isPending ? 'Forlater...' : 'Ja, forlat'}
                </button>
              </div>
              {leaveError && (
                <p className="text-destructive text-sm text-center">{leaveError}</p>
              )}
            </div>
          )}

          <div className="pt-2 space-y-3 text-center text-xs text-muted-foreground">
            <div className="flex items-center justify-center gap-4">
              <a
                href="https://pastelly.no/personvern"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                Personvern
              </a>
              <a
                href="mailto:hei@pastelly.no?subject=Slett%20kontoen%20min"
                className="underline underline-offset-2"
              >
                Slett konto
              </a>
            </div>
            <p>Pastelly v{import.meta.env.VITE_APP_VERSION ?? '1.0.0'}</p>
          </div>
        </ProfileFolder>
        </div>
      </div>

      <AnimatePresence>
        {cropImageSrc && (
          <AvatarCropModal
            imageSrc={cropImageSrc}
            onCropDone={handleCropDone}
            onCancel={() => setCropImageSrc(null)}
          />
        )}
      </AnimatePresence>
    </CenteredPopup>
  );
};

export default ProfileSheet;
