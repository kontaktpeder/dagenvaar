import { useState, useCallback, useMemo, useRef, useEffect, type Dispatch, type SetStateAction } from 'react';
import { Navigate } from 'react-router-dom';
import { startOfMonth } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { getRecoveryState } from '@/lib/auth/recoveryState';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentHouseholdContext } from '@/hooks/useCurrentHouseholdContext';
import { useMembers } from '@/hooks/useHousehold';
import { useHouseholdHasEvents } from '@/hooks/useHouseholdHasEvents';
import { adjacentCalendarId, sortCalendarMemberships } from '@/lib/calendarStack';
import { resolveCalendarKind } from '@/lib/calendarKinds';
import { isSeedWeekDismissed } from '@/lib/seedWeekStorage';
import { LocaleProvider } from '@/hooks/useLocale';
import AuthPage from '@/pages/Auth';
import Landing from '@/pages/Landing';
import { isNativePlatform } from '@/lib/native/platform';
import OnboardingPage from '@/pages/Onboarding';
import CalendarView from '@/components/CalendarView';
import ListView from '@/components/ListView';
import CalendarSwitcher from '@/components/CalendarSwitcher';
import NewEventFlow from '@/components/NewEventFlow';
import NewCountdownFlow from '@/components/NewCountdownFlow';
import EditEventFlow from '@/components/EditEventFlow';
import EditEventQuickSheet from '@/components/EditEventQuickSheet';
import SeedWeekFlow from '@/components/SeedWeekFlow';
import WelcomeDialog from '@/components/WelcomeDialog';
import ProfileSheet, { type ProfileSheetMode } from '@/components/ProfileSheet';
import { toast } from 'sonner';
import { peekWelcomeIntent, consumeWelcomeIntent, type WelcomeIntent } from '@/lib/welcomeIntent';
import { peekPendingInviteCode } from '@/lib/inviteLink';
import { peekSessionNotice } from '@/lib/auth/sessionNotice';
import type { Event } from '@/hooks/useEvents';

export type Highlight = { eventId: string; dateStr: string; ts: number } | null;

const stackTransition = {
  type: 'tween' as const,
  duration: 0.2,
  ease: [0.32, 0.72, 0, 1] as [number, number, number, number],
};

const Index = () => {
  const { loading: authLoading, signOut } = useAuth();
  const {
    user,
    household,
    currentMember,
    memberships,
    setActiveHouseholdId,
    loading: ctxLoading,
    error: ctxError,
    refetch: refetchContext,
    invalidate,
  } = useCurrentHouseholdContext();
  const { data: members = [] } = useMembers(household?.id);
  const { data: hasEvents, isSuccess: hasEventsReady } = useHouseholdHasEvents(household?.id);
  const queryClient = useQueryClient();
  const [focusedDate, setFocusedDate] = useState<Date>(() => new Date());
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [newEventDate, setNewEventDate] = useState<Date | undefined>();
  const [showNewCountdown, setShowNewCountdown] = useState(false);
  const [newCountdownDate, setNewCountdownDate] = useState<Date | undefined>();
  const [profileMode, setProfileMode] = useState<ProfileSheetMode | null>(null);
  const [editEvent, setEditEvent] = useState<Event | null>(null);
  const [quickEditEvent, setQuickEditEvent] = useState<Event | null>(null);
  const [showSeedWeek, setShowSeedWeek] = useState(false);
  const [welcomeDialog, setWelcomeDialog] = useState<WelcomeIntent | null>(null);
  const [highlight, setHighlight] = useState<Highlight>(null);
  const [stackDirection, setStackDirection] = useState(0);
  const switchingRef = useRef(false);
  const seedAutoOpenedRef = useRef<string | null>(null);
  const [authView, setAuthView] = useState<null | 'login' | 'signup'>(() => {
    if (peekPendingInviteCode()) return 'signup';
    if (peekSessionNotice() === 'email_confirmed_login') return 'login';
    if (isNativePlatform()) return 'login';
    return null;
  });

  const orderedMemberships = useMemo(
    () => sortCalendarMemberships(memberships),
    [memberships],
  );

  const stackIndex = useMemo(() => {
    if (!household) return 0;
    const idx = orderedMemberships.findIndex((m) => m.household_id === household.id);
    return idx >= 0 ? idx : 0;
  }, [orderedMemberships, household]);

  const selectCalendar = useCallback(
    (id: string, direction?: number) => {
      if (!household || id === household.id || switchingRef.current) return;
      if (direction !== undefined) setStackDirection(direction);
      else {
        const from = orderedMemberships.findIndex((m) => m.household_id === household.id);
        const to = orderedMemberships.findIndex((m) => m.household_id === id);
        setStackDirection(to >= from ? 1 : -1);
      }
      switchingRef.current = true;
      setActiveHouseholdId(id);
      window.setTimeout(() => {
        switchingRef.current = false;
      }, 320);
    },
    [household, orderedMemberships, setActiveHouseholdId],
  );

  const handleSwipeCalendarStack = useCallback(
    (direction: 1 | -1) => {
      if (!household) return;
      if (showNewEvent || showNewCountdown || editEvent || quickEditEvent || profileMode || showSeedWeek) return;
      const nextId = adjacentCalendarId(memberships, household.id, direction);
      if (nextId) selectCalendar(nextId, direction);
    },
    [household, memberships, selectCalendar, showNewEvent, showNewCountdown, editEvent, quickEditEvent, profileMode, showSeedWeek],
  );

  const calendarKind = household ? resolveCalendarKind(household) : 'home';
  const canSeedWeek =
    !!household &&
    calendarKind === 'home' &&
    hasEventsReady &&
    hasEvents === false;

  useEffect(() => {
    if (!household || !canSeedWeek) return;
    if (isSeedWeekDismissed(household.id)) return;
    if (seedAutoOpenedRef.current === household.id) return;
    seedAutoOpenedRef.current = household.id;
    setShowSeedWeek(true);
  }, [household, canSeedWeek]);

  // Join welcome: after onboarding or joining via profile (no seed step).
  // Create welcome: wait until seed finishes / is skipped (see revealWelcomeAfterSeed).
  useEffect(() => {
    if (!household || !hasEventsReady) return;
    const pending = peekWelcomeIntent(household.id);
    if (pending === 'join') {
      consumeWelcomeIntent(household.id);
      const t = window.setTimeout(() => setWelcomeDialog('join'), 400);
      return () => window.clearTimeout(t);
    }
    if (pending === 'create' && !canSeedWeek) {
      // Seed won't open (already has events / not home) — welcome now.
      consumeWelcomeIntent(household.id);
      const t = window.setTimeout(() => setWelcomeDialog('create'), 400);
      return () => window.clearTimeout(t);
    }
  }, [household, hasEventsReady, canSeedWeek]);

  const revealWelcomeAfterSeed = useCallback(() => {
    if (!household) return;
    const pending = consumeWelcomeIntent(household.id);
    if (pending) {
      window.setTimeout(() => setWelcomeDialog(pending), 280);
    }
  }, [household]);

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

  if (getRecoveryState().isRecoveryFlow) {
    return <Navigate to="/auth/update-password" replace />;
  }

  if (authLoading || ctxLoading) {
    return (
      <LocaleProvider>
        <div className="min-h-[100dvh] flex items-center justify-center bg-background">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4 motion-reduce:animate-none" />
            <p className="text-muted-foreground">Laster...</p>
          </motion.div>
        </div>
      </LocaleProvider>
    );
  }

  if (!user) {
    if (!authView) {
      return (
        <LocaleProvider>
          <Landing
            onGetStarted={() => setAuthView('signup')}
            onSignIn={() => setAuthView('login')}
          />
        </LocaleProvider>
      );
    }
    return (
      <LocaleProvider>
        <AuthPage initialMode={authView} />
      </LocaleProvider>
    );
  }

  if (ctxError) {
    return (
      <LocaleProvider>
        <div className="h-[100dvh] bg-background flex items-center justify-center px-6 py-safe">
          <div className="w-full max-w-sm text-center">
            <p className="text-4xl mb-4" aria-hidden>📡</p>
            <h1 className="text-2xl font-bold mb-2">Kunne ikke hente kalenderen</h1>
            <p className="text-muted-foreground mb-6">
              Kalenderen din er fortsatt trygg. Kontroller forbindelsen og prøv igjen.
            </p>
            <button
              type="button"
              onClick={() => void refetchContext()}
              className="min-h-12 w-full rounded-2xl bg-primary px-5 py-3 font-semibold text-primary-foreground"
            >
              Prøv igjen
            </button>
          </div>
        </div>
      </LocaleProvider>
    );
  }

  if (!household || !currentMember) {
    return (
      <LocaleProvider>
        <OnboardingPage onComplete={invalidate} />
      </LocaleProvider>
    );
  }

  const handleSelectDate = (date: Date) => {
    setFocusedDate(date);
  };

  const handleCreateEvent = (date: Date) => {
    setNewEventDate(date);
    setShowNewEvent(true);
  };

  const handleCreateCountdown = (date: Date) => {
    setNewCountdownDate(date);
    setShowNewCountdown(true);
  };

  const handleEditEvent = (event: Event) => {
    setEditEvent(event);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setProfileMode(null);
      queryClient.clear();
    } catch (err: any) {
      console.error('Sign out error:', err);
      toast.error('Feil ved utlogging', {
        description: err?.message ?? 'Kunne ikke logge ut. Prøv igjen.',
      });
    }
  };

  const canSwipeStack = orderedMemberships.length > 1;

  return (
    <LocaleProvider calendarLocale={(household as any).locale}>
    <div
      data-calendar-kind={calendarKind}
      className="h-[100dvh] w-full bg-background flex flex-col max-w-6xl mx-auto relative overflow-hidden"
    >
      <header className="flex items-center justify-between gap-4 px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 z-10">
        <CalendarSwitcher
          household={household}
          memberships={orderedMemberships}
          stackIndex={stackIndex}
          onSelect={(id) => selectCalendar(id)}
          onOpenSettings={(id) => {
            if (id !== household.id) selectCalendar(id);
            // Defer sheet open so calendar switch paint isn't blocked (esp. Android)
            window.requestAnimationFrame(() => setProfileMode('calendar'));
          }}
        />
        <button
          onClick={() => {
            window.requestAnimationFrame(() => setProfileMode('account'));
          }}
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

      <main className="flex-1 min-h-0 overflow-hidden relative bg-background md:grid md:grid-cols-[minmax(0,1fr)_22rem] lg:grid-cols-[minmax(0,1fr)_24rem]">
        {/* Single instance — no exit/enter overlap (avoids layered calendars) */}
        <motion.div
          key={household.id}
          initial={{ y: stackDirection >= 0 ? 36 : -36 }}
          animate={{ y: 0 }}
          transition={stackTransition}
          className="h-full min-w-0 flex flex-col bg-background"
        >
          <CalendarView
            householdId={household.id}
            members={members}
            currentMemberId={currentMember.id}
            calendarKind={calendarKind}
            currentDate={calendarMonthAnchor}
            onCurrentDateChange={handleCalendarMonthChange}
            onSelectDate={handleSelectDate}
            onCreateEvent={handleCreateEvent}
            onCreateCountdown={calendarKind === 'home' ? handleCreateCountdown : undefined}
            onEditEvent={handleEditEvent}
            onQuickEditEvent={setQuickEditEvent}
            onSwitchCalendar={(id) => selectCalendar(id)}
            onSwipeCalendarStack={handleSwipeCalendarStack}
            canSwipeCalendarStack={canSwipeStack}
            highlight={highlight}
            canSeedWeek={canSeedWeek}
            onSeedWeek={() => setShowSeedWeek(true)}
          />
        </motion.div>

        <aside className="hidden min-h-0 flex-col border-l border-border/70 bg-card/70 md:flex">
          <div className="shrink-0 border-b border-border/60 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Valgt dag
            </p>
            <h2 className="mt-1 text-lg font-bold capitalize">
              {focusedDate.toLocaleDateString(
                (household as any).locale === 'en' ? 'en-GB' : 'nb-NO',
                { weekday: 'long', day: 'numeric', month: 'long' },
              )}
            </h2>
          </div>
          <div className="min-h-0 flex-1">
            <ListView
              householdId={household.id}
              members={members}
              currentMemberId={currentMember.id}
              calendarKind={calendarKind}
              initialDate={focusedDate}
              embedded
              highlight={highlight}
              onEditEvent={handleEditEvent}
              onQuickEditEvent={setQuickEditEvent}
            />
          </div>
        </aside>
      </main>

      <AnimatePresence>
        {showSeedWeek && (
          <SeedWeekFlow
            householdId={household.id}
            onClose={() => {
              setShowSeedWeek(false);
              revealWelcomeAfterSeed();
            }}
            onComplete={() => {
              setShowSeedWeek(false);
              revealWelcomeAfterSeed();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {welcomeDialog && (
          <WelcomeDialog
            intent={welcomeDialog}
            householdId={household.id}
            onClose={() => setWelcomeDialog(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNewEvent && (
          <NewEventFlow
            householdId={household.id}
            members={members}
            currentMemberId={currentMember.id}
            calendarKind={household.kind}
            showInOtherCalendars={!!currentMember.show_in_other_calendars}
            initialDate={newEventDate}
            onClose={() => setShowNewEvent(false)}
            onCreated={(eventId, dateStr) => {
              flashHighlight(eventId, dateStr);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNewCountdown && (
          <NewCountdownFlow
            householdId={household.id}
            members={members}
            currentMemberId={currentMember.id}
            initialDate={newCountdownDate}
            onClose={() => setShowNewCountdown(false)}
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
            calendarKind={household.kind}
            showInOtherCalendars={!!currentMember.show_in_other_calendars}
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
            calendarKind={household.kind}
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
        {profileMode && (
          <ProfileSheet
            key={profileMode}
            mode={profileMode}
            household={household}
            members={members}
            currentMember={currentMember}
            memberships={orderedMemberships}
            onSelectCalendar={(id) => selectCalendar(id)}
            onClose={() => setProfileMode(null)}
            onSignOut={handleSignOut}
          />
        )}
      </AnimatePresence>
    </div>
    </LocaleProvider>
  );
};

export default Index;
