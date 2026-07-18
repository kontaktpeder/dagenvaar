import { useState, useCallback, useMemo, type Dispatch, type SetStateAction } from 'react';
import { Navigate } from 'react-router-dom';
import { startOfMonth } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { getRecoveryState } from '@/lib/auth/recoveryState';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentHouseholdContext } from '@/hooks/useCurrentHouseholdContext';
import { useMembers } from '@/hooks/useHousehold';
import AuthPage from '@/pages/Auth';
import OnboardingPage from '@/pages/Onboarding';
import CalendarView from '@/components/CalendarView';
import NewEventFlow from '@/components/NewEventFlow';
import EditEventFlow from '@/components/EditEventFlow';
import EditEventQuickSheet from '@/components/EditEventQuickSheet';
import ProfileSheet from '@/components/ProfileSheet';
import { useToast } from '@/hooks/use-toast';
import type { Event } from '@/hooks/useEvents';

export type Highlight = { eventId: string; dateStr: string; ts: number } | null;

const Index = () => {
  const { loading: authLoading, signOut } = useAuth();
  const { user, household, currentMember, loading: ctxLoading, invalidate } = useCurrentHouseholdContext();
  const { data: members = [] } = useMembers(household?.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [focusedDate, setFocusedDate] = useState<Date>(() => new Date());
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [newEventDate, setNewEventDate] = useState<Date | undefined>();
  const [showProfile, setShowProfile] = useState(false);
  const [editEvent, setEditEvent] = useState<Event | null>(null);
  const [quickEditEvent, setQuickEditEvent] = useState<Event | null>(null);
  const [highlight, setHighlight] = useState<Highlight>(null);

  const flashHighlight = useCallback((eventId: string, dateStr: string) => {
    setHighlight({ eventId, dateStr, ts: Date.now() });
    const [y, m, d] = dateStr.split('-').map(Number);
    if (y && m && d) setFocusedDate(new Date(y, m - 1, d));
    window.setTimeout(() => setHighlight(null), 1400);
  }, []);

  const handleCalendarMonthChange = useCallback<Dispatch<SetStateAction<Date>>>(
    (update) => {
      setFocusedDate((prev) => {
        const anchor = startOfMonth(prev);
        const nextAnchor = typeof update === 'function' ? update(anchor) : update;
        const y = nextAnchor.getFullYear();
        const m = nextAnchor.getMonth();
        const lastDay = new Date(y, m + 1, 0).getDate();
        const day = Math.min(prev.getDate(), lastDay);
        return new Date(y, m, day);
      });
    },
    [],
  );

  const calendarMonthAnchor = useMemo(() => startOfMonth(focusedDate), [focusedDate]);

  // If a password-recovery flow is active, always route to the update-password
  // page — never render the calendar mid-recovery.
  if (getRecoveryState().isRecoveryFlow) {
    return <Navigate to="/auth/update-password" replace />;
  }

  if (authLoading || ctxLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4 motion-reduce:animate-none" />
          <p className="text-muted-foreground">Laster...</p>
        </motion.div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  if (!household || !currentMember) {
    return <OnboardingPage onComplete={invalidate} />;
  }

  const handleSelectDate = (date: Date) => {
    setFocusedDate(date);
  };

  const handleCreateEvent = (date: Date) => {
    setNewEventDate(date);
    setShowNewEvent(true);
  };

  const handleEditEvent = (event: Event) => {
    setEditEvent(event);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setShowProfile(false);
      queryClient.clear();
    } catch (err: any) {
      console.error('Sign out error:', err);
      toast({
        title: 'Feil ved utlogging',
        description: err?.message ?? 'Kunne ikke logge ut. Prøv igjen.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="h-[100dvh] bg-background flex flex-col max-w-lg mx-auto relative overflow-hidden">
      {/* Header — single safe-area pad (native WebView is edge-to-edge) */}
      <header className="flex items-center justify-between gap-4 px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <h1 className="text-xl font-bold tracking-tight truncate min-w-0">{household.name}</h1>
        <button
          onClick={() => setShowProfile(true)}
          className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden shadow-sm"
          style={
            !currentMember.avatar_url
              ? { backgroundColor: `hsl(var(--member-${currentMember.color_token.replace('pastel-', '')}))` }
              : undefined
          }
        >
          {currentMember.avatar_url ? (
            <img src={currentMember.avatar_url} alt={currentMember.display_name} className="w-full h-full object-cover" />
          ) : (
            currentMember.display_name.charAt(0)
          )}
        </button>
      </header>

      {/* Content fills to the home indicator; calendar paints into the bottom */}
      <main className="flex-1 min-h-0 overflow-hidden">
        <CalendarView
          householdId={household.id}
          members={members}
          currentMemberId={currentMember.id}
          currentDate={calendarMonthAnchor}
          onCurrentDateChange={handleCalendarMonthChange}
          onSelectDate={handleSelectDate}
          onCreateEvent={handleCreateEvent}
          onEditEvent={handleEditEvent}
          onQuickEditEvent={setQuickEditEvent}
          highlight={highlight}
        />
      </main>

      <AnimatePresence>
        {showNewEvent && (
          <NewEventFlow
            householdId={household.id}
            members={members}
            currentMemberId={currentMember.id}
            initialDate={newEventDate}
            onClose={() => setShowNewEvent(false)}
            onCreated={(eventId, dateStr) => {
              flashHighlight(eventId, dateStr);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editEvent && (
          <EditEventFlow
            event={editEvent}
            householdId={household.id}
            members={members}
            currentMemberId={currentMember.id}
            onClose={() => setEditEvent(null)}
            onSaved={(eventId, dateStr) => {
              flashHighlight(eventId, dateStr);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {quickEditEvent && (
          <EditEventQuickSheet
            event={quickEditEvent}
            householdId={household.id}
            members={members}
            currentMemberId={currentMember.id}
            onClose={() => setQuickEditEvent(null)}
            onSaved={(eventId, dateStr) => {
              flashHighlight(eventId, dateStr);
            }}
            onOpenFullEdit={(ev) => {
              setQuickEditEvent(null);
              setEditEvent(ev);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProfile && (
          <ProfileSheet household={household} members={members} currentMember={currentMember}
            onClose={() => setShowProfile(false)} onSignOut={handleSignOut} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
