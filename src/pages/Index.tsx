import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentHouseholdContext } from '@/hooks/useCurrentHouseholdContext';
import { useMembers } from '@/hooks/useHousehold';
import AuthPage from '@/pages/Auth';
import OnboardingPage from '@/pages/Onboarding';
import CalendarView from '@/components/CalendarView';
import ListView from '@/components/ListView';
import NewEventFlow from '@/components/NewEventFlow';
import ProfileSheet from '@/components/ProfileSheet';
import { useToast } from '@/hooks/use-toast';

type Tab = 'calendar' | 'list';

const Index = () => {
  const { loading: authLoading, signOut } = useAuth();
  const { user, household, currentMember, loading: ctxLoading, invalidate } = useCurrentHouseholdContext();
  const { data: members = [] } = useMembers(household?.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [newEventDate, setNewEventDate] = useState<Date | undefined>();
  const [showProfile, setShowProfile] = useState(false);

  if (authLoading || ctxLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4" />
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
    setSelectedDate(date);
    setActiveTab('list');
  };

  const handleCreateEvent = (date: Date) => {
    setNewEventDate(date);
    setShowNewEvent(true);
  };

  const handleNewFromNav = () => {
    setNewEventDate(undefined);
    setShowNewEvent(true);
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
    <div className="h-screen bg-background flex flex-col max-w-lg mx-auto relative overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-4 pb-2">
        <h1 className="text-lg font-bold">{household.name}</h1>
        <button
          onClick={() => setShowProfile(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
          style={{
            backgroundColor: `hsl(var(--member-${currentMember.color_token.replace('pastel-', '')}))`,
          }}
        >
          {currentMember.display_name.charAt(0)}
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'calendar' && (
            <motion.div key="cal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <CalendarView householdId={household.id} members={members} onSelectDate={handleSelectDate} onCreateEvent={handleCreateEvent} />
            </motion.div>
          )}
          {activeTab === 'list' && (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              <ListView householdId={household.id} members={members} currentMemberId={currentMember.id} initialDate={selectedDate} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating navbar */}
      <nav className="fixed bottom-0 left-0 right-0 flex justify-center pb-6 px-5 z-40 pointer-events-none">
        <div className="bg-nav-bg rounded-[28px] shadow-nav px-3 py-2.5 flex items-center pointer-events-auto border border-primary/10">
          <button onClick={() => setActiveTab('calendar')}
            className={`flex flex-col items-center w-20 py-2 rounded-2xl transition-all ${activeTab === 'calendar' ? 'bg-calendar-accent text-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span className="text-[11px] font-semibold mt-1">Kalender</span>
          </button>

          <button onClick={handleNewFromNav}
            className="w-14 h-14 rounded-full bg-green-200 flex items-center justify-center text-green-900 shadow-soft-lg -my-4 mx-3 transition-all hover:scale-105 hover:bg-green-300 active:scale-95 ring-4 ring-background">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>

          <button onClick={() => { setSelectedDate(undefined); setActiveTab('list'); }}
            className={`flex flex-col items-center w-20 py-2 rounded-2xl transition-all ${activeTab === 'list' ? 'bg-list-accent text-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            <span className="text-[11px] font-semibold mt-1">Liste</span>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {showNewEvent && (
          <NewEventFlow householdId={household.id} members={members} currentMemberId={currentMember.id}
            initialDate={newEventDate} onClose={() => setShowNewEvent(false)} />
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
