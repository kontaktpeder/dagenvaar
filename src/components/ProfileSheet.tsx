import { useState, useRef, type ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getMemberColor } from '@/lib/colors';
import type { HouseholdMember, Household } from '@/hooks/useHousehold';
import type { CalendarMembership } from '@/hooks/useCurrentHouseholdContext';
import {
  CALENDAR_KINDS,
  calendarKindLabel,
  defaultShowInOtherCalendars,
  type CalendarKind,
} from '@/lib/calendarKinds';
import { setStoredActiveHouseholdId } from '@/lib/activeHousehold';
import { Camera, ChevronDown } from 'lucide-react';
import AvatarCropModal from '@/components/AvatarCropModal';
import CategoryColorSettings from '@/components/CategoryColorSettings';
import DailyDigestSettings from '@/components/DailyDigestSettings';
import CenteredPopup from '@/components/CenteredPopup';

interface ProfileSheetProps {
  household: Household;
  members: HouseholdMember[];
  currentMember: HouseholdMember;
  memberships: CalendarMembership[];
  onSelectCalendar: (householdId: string) => void;
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
        className={`text-muted-foreground shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
      />
    </button>
    {open && (
      <div className="pb-5 pt-0 space-y-3">
        {children}
      </div>
    )}
  </div>
);

type FolderKey = 'denne' | 'generelt';

const ProfileSheet = ({
  household,
  members,
  currentMember,
  memberships,
  onSelectCalendar,
  onClose,
  onSignOut,
}: ProfileSheetProps) => {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteExpiry, setInviteExpiry] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createKind, setCreateKind] = useState<CalendarKind>('work');
  const [createName, setCreateName] = useState('Jobb');
  const [createError, setCreateError] = useState('');
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaveError, setLeaveError] = useState('');
  const [openFolders, setOpenFolders] = useState<Record<FolderKey, boolean>>({
    denne: true,
    generelt: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const toggleFolder = (key: FolderKey) => {
    setOpenFolders((prev) => {
      const nextOpen = !prev[key];
      return {
        denne: false,
        generelt: false,
        [key]: nextOpen,
      };
    });
  };

  const leaveHousehold = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('leave_household', {
        p_household_id: household.id,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setLeaveError('');
      setShowLeaveConfirm(false);
      const remaining = memberships.filter((m) => m.household_id !== household.id);
      if (remaining[0]) {
        setStoredActiveHouseholdId(remaining[0].household_id);
        onSelectCalendar(remaining[0].household_id);
      }
      await queryClient.invalidateQueries();
      onClose();
    },
    onError: (err: any) => {
      setLeaveError(err?.message ?? 'Kunne ikke forlate kalenderen');
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
      const { data, error } = await supabase.rpc('join_household_by_code', {
        p_invite_code: code,
        p_display_name: currentMember.display_name || 'Meg',
        p_color_token: currentMember.color_token || 'pastel-blue',
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: async (newId) => {
      setJoinError('');
      setJoinCode('');
      setShowJoin(false);
      if (newId) {
        setStoredActiveHouseholdId(newId);
        onSelectCalendar(newId);
      }
      await queryClient.invalidateQueries();
      onClose();
    },
    onError: (err: any) => {
      setJoinError(err?.message ?? 'Kunne ikke bli med via kode');
    },
  });

  const createCalendar = useMutation({
    mutationFn: async () => {
      const meta = CALENDAR_KINDS.find((k) => k.value === createKind)!;
      const { data, error } = await supabase.rpc('create_household_with_owner', {
        p_name: createName.trim() || meta.defaultName,
        p_display_name: currentMember.display_name || 'Meg',
        p_color_token: currentMember.color_token || 'pastel-blue',
        p_kind: createKind,
        p_show_in_other_calendars: defaultShowInOtherCalendars(createKind),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      setCreateError('');
      setShowCreate(false);
      if (data?.id) {
        setStoredActiveHouseholdId(data.id);
        onSelectCalendar(data.id);
      }
      await queryClient.invalidateQueries();
      onClose();
    },
    onError: (err: any) => {
      setCreateError(err?.message ?? 'Kunne ikke opprette kalender');
    },
  });

  const createInvite = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('create_household_invite', {
        p_household_id: household.id,
      });
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

  const toggleShowInOther = useMutation({
    mutationFn: async (next: boolean) => {
      const { error } = await supabase
        .from('households')
        .update({ show_in_other_calendars: next })
        .eq('id', household.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-household-context'] });
      queryClient.invalidateQueries({ queryKey: ['overlay-events'] });
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
        <div
          data-sheet-scroll
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-touch touch-pan-y px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        >
          <section className="shrink-0 text-center pt-2 pb-5">
          <div className="relative w-20 h-20 mx-auto mb-3">
            <MemberAvatar member={currentMember} size="lg" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadAvatar.isPending}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md transition-transform hover:scale-110 disabled:opacity-50"
            >
              {uploadAvatar.isPending ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
              ) : (
                <Camera size={15} strokeWidth={2.5} />
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
          <h2 className="text-2xl font-bold">{currentMember.display_name}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {household.name}
            <span className="text-muted-foreground/70"> · {calendarKindLabel(household)}</span>
          </p>
        </section>

        <div className="rounded-2xl bg-muted/40 px-4 mb-2">
        <ProfileFolder
          title={`Denne kalenderen`}
          open={openFolders.denne}
          onToggle={() => toggleFolder('denne')}
        >
          <p className="text-xs text-muted-foreground px-0.5 -mt-1 mb-1">
            Gjelder bare «{household.name}»
          </p>

          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-xl bg-background p-3">
                <MemberAvatar member={m} size="sm" />
                <div>
                  <p className="font-medium text-sm">{m.display_name}</p>
                  <p className="text-xs text-muted-foreground">{m.role === 'owner' ? 'Eier' : 'Medlem'}</p>
                </div>
              </div>
            ))}
          </div>

          {isOwner && (
            <label className="flex items-start gap-3 rounded-xl bg-background p-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 rounded border-border"
                checked={household.show_in_other_calendars}
                disabled={toggleShowInOther.isPending}
                onChange={(e) => toggleShowInOther.mutate(e.target.checked)}
              />
              <span>
                <span className="block text-sm font-medium">Vis i andre kalendere</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  Vises som «{household.name}» + tidspunkt hos dine andre kalendere
                </span>
              </span>
            </label>
          )}

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
                <div className="rounded-xl bg-background p-4 space-y-3">
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

          <div className="pt-2 space-y-3 border-t border-border/50">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-0.5">
              Innstillinger for denne kalenderen
            </p>
            <DailyDigestSettings member={currentMember} />
            <CategoryColorSettings member={currentMember} />
          </div>

          {!showLeaveConfirm ? (
            <button
              onClick={() => { setLeaveError(''); setShowLeaveConfirm(true); }}
              className="w-full rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Forlat denne kalenderen
            </button>
          ) : (
            <div className="rounded-xl bg-muted p-4 space-y-3">
              <p className="text-sm font-medium text-center">
                Er du sikker på at du vil forlate «{household.name}»?
              </p>
              <p className="text-xs text-muted-foreground text-center">
                {members.length <= 1
                  ? 'Du er eneste medlem – kalenderen og alt innhold blir slettet.'
                  : currentMember.role === 'owner'
                  ? 'Du er eier. Eierskapet overføres til et annet medlem.'
                  : 'Du mister tilgang til hendelser og lister i denne kalenderen.'}
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
        </ProfileFolder>

        <ProfileFolder
          title="Generelt"
          open={openFolders.generelt}
          onToggle={() => toggleFolder('generelt')}
        >
          <p className="text-xs text-muted-foreground px-0.5 -mt-1 mb-1">
            Gjelder kontoen din og alle kalendere
          </p>

          {memberships.length > 1 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-0.5">
                Mine kalendere
              </p>
              {memberships.map((m) => (
                <button
                  key={m.household_id}
                  type="button"
                  onClick={() => {
                    onSelectCalendar(m.household_id);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                    m.household_id === household.id
                      ? 'bg-primary/15 font-semibold'
                      : 'bg-background hover:bg-muted'
                  }`}
                >
                  <span className="truncate">{m.household.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    {calendarKindLabel(m.household)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {!showCreate ? (
            <button
              type="button"
              onClick={() => {
                setShowCreate(true);
                setShowJoin(false);
                setCreateError('');
                setCreateKind('work');
                setCreateName('Jobb');
              }}
              className="w-full rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Opprett ny kalender
            </button>
          ) : (
            <div className="rounded-xl bg-muted p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {CALENDAR_KINDS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setCreateKind(opt.value);
                      setCreateName(opt.defaultName);
                    }}
                    className={`rounded-xl p-2.5 text-sm font-semibold ${
                      createKind === opt.value ? 'bg-primary/20 ring-2 ring-primary' : 'bg-background'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Navn"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setCreateError(''); }}
                  className="rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-background transition-colors"
                >
                  Avbryt
                </button>
                <button
                  type="button"
                  onClick={() => createCalendar.mutate()}
                  disabled={createCalendar.isPending}
                  className="rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {createCalendar.isPending ? 'Oppretter...' : 'Opprett'}
                </button>
              </div>
              {createError && (
                <p className="text-destructive text-sm text-center">{createError}</p>
              )}
            </div>
          )}

          {!showJoin ? (
            <button
              type="button"
              onClick={() => { setShowJoin(true); setShowCreate(false); setJoinError(''); }}
              className="w-full rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Bli med via kode
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

          <div className="pt-2 space-y-3 border-t border-border/50">
            <button
              onClick={handleSignOutClick}
              disabled={isSigningOut}
              className="w-full rounded-xl border border-border bg-background py-3 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSigningOut ? 'Logger ut...' : 'Logg ut'}
            </button>
            {signOutError && (
              <p className="text-destructive text-sm text-center">{signOutError}</p>
            )}
          </div>

          <div className="pt-1 space-y-3 text-center text-xs text-muted-foreground">
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
