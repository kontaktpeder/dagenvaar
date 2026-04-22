import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, isWeekend, isSameMonth, addMonths, subMonths } from 'date-fns';
import { nb } from 'date-fns/locale';
import { useEventsForMonth, type Event } from '@/hooks/useEvents';
import { getMemberColor } from '@/lib/colors';
import { resolveCategoryVisuals, getMemberColorMap } from '@/lib/categoryPresentation';
import { EVENT_CATEGORY_META } from '@/lib/eventCategories';
import { getMonthTheme } from '@/lib/monthTheme';
import type { HouseholdMember } from '@/hooks/useHousehold';
import type { Highlight } from '@/pages/Index';
import ViewHeader from '@/components/ViewHeader';
import CalendarDaySheet from '@/components/CalendarDaySheet';
import EventDetailSheet from '@/components/EventDetailSheet';
import { useLongPress } from '@/hooks/useLongPress';

interface CalendarViewProps {
  householdId: string;
  members: HouseholdMember[];
  currentMemberId: string;
  onSelectDate: (date: Date) => void;
  onCreateEvent: (date: Date) => void;
  onEditEvent?: (event: Event) => void;
  highlight?: Highlight;
}

const WEEKDAYS = ['man', 'tir', 'ons', 'tor', 'fre', 'lør', 'søn'];

const CalendarView = ({ householdId, members, currentMemberId, onSelectDate, onCreateEvent, onEditEvent, highlight }: CalendarViewProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [direction, setDirection] = useState(0);
  const [showYear, setShowYear] = useState(false);
  const [daySheetDate, setDaySheetDate] = useState<Date | null>(null);
  const [detailEvent, setDetailEvent] = useState<Event | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const { data: events = [] } = useEventsForMonth(householdId, year, month);

  const monthTheme = useMemo(() => getMonthTheme(currentDate), [currentDate]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, Event[]> = {};
    events.forEach((e) => {
      const start = e.event_date;
      const end = (e as any).end_date || e.event_date;
      let current = start;
      while (current <= end) {
        if (!map[current]) map[current] = [];
        map[current].push(e);
        const d = new Date(current + 'T12:00:00');
        d.setDate(d.getDate() + 1);
        current = d.toISOString().slice(0, 10);
      }
    });
    return map;
  }, [events]);

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentDate]);

  const navigate = useCallback((dir: number) => {
    setDirection(dir);
    setCurrentDate((d) => dir > 0 ? addMonths(d, 1) : subMonths(d, 1));
  }, []);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 50) {
      navigate(info.offset.x < 0 ? 1 : -1);
    }
  };

  let lastTapTime = 0;
  const handleDayTap = (day: Date) => {
    const now = Date.now();
    if (now - lastTapTime < 300) {
      onCreateEvent(day);
    } else {
      onSelectDate(day);
    }
    lastTapTime = now;
  };

  const getMemberForEvent = (event: Event) => {
    return members.find((m) => m.id === event.owner_member_id);
  };

  if (showYear) {
    return (
      <YearView
        year={year}
        onSelectMonth={(m) => {
          setCurrentDate(new Date(year, m, 1));
          setShowYear(false);
        }}
        onBack={() => setShowYear(false)}
        onChangeYear={(y) => setCurrentDate(new Date(y, month, 1))}
      />
    );
  }

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Month header with dynamic theme */}
        <ViewHeader
          variant="calendar"
          onPrev={() => navigate(-1)}
          onNext={() => navigate(1)}
          onTitleClick={() => setShowYear(true)}
          calendarStyle={{ background: monthTheme.gradient }}
        >
          {format(currentDate, 'MMMM yyyy', { locale: nb })}
        </ViewHeader>

        {/* Weekday headers */}
        <div className="bg-transparent">
          <div className="grid grid-cols-7 px-3 py-3">
            {WEEKDAYS.map((d, i) => (
              <div key={d} className={`text-center text-[13px] font-bold uppercase tracking-wider ${
                i >= 5 ? 'text-primary/60' : 'text-foreground/50'
              }`}>
                {d}
              </div>
            ))}
          </div>
        </div>

        {/* Days grid */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={`${year}-${month}`}
            custom={direction}
            initial={{ x: direction * 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -direction * 100, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="grid grid-cols-7 px-3 flex-1 pt-1 content-stretch"
          >
            {days.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayEvents = eventsByDate[dateStr] || [];
              const inMonth = isSameMonth(day, currentDate);
              const today = isToday(day);
              const weekend = isWeekend(day);
              const isHighlighted = highlight && highlight.dateStr === dateStr;

              return (
                <DayCell
                  key={dateStr}
                  day={day}
                  dateStr={dateStr}
                  dayEvents={dayEvents}
                  inMonth={inMonth}
                  today={today}
                  weekend={weekend}
                  isHighlighted={!!isHighlighted}
                  monthTheme={monthTheme}
                  members={members}
                  highlight={highlight}
                  onTap={handleDayTap}
                  onLongPress={(d) => setDaySheetDate(d)}
                  getMemberForEvent={getMemberForEvent}
                />
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {daySheetDate && (
          <CalendarDaySheet
            date={daySheetDate}
            events={eventsByDate[format(daySheetDate, 'yyyy-MM-dd')] || []}
            members={members}
            onClose={() => setDaySheetDate(null)}
            onPickEvent={(ev) => {
              setDaySheetDate(null);
              setDetailEvent(ev);
            }}
            onCreateForDate={(d) => {
              setDaySheetDate(null);
              onCreateEvent(d);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detailEvent && (
          <EventDetailSheet
            event={detailEvent}
            members={members}
            currentMemberId={currentMemberId}
            onClose={() => setDetailEvent(null)}
            onEdit={onEditEvent ? (ev) => { setDetailEvent(null); onEditEvent(ev); } : undefined}
          />
        )}
      </AnimatePresence>
    </>
  );
};

/* ---------- DayCell with long-press ---------- */

interface DayCellProps {
  day: Date;
  dateStr: string;
  dayEvents: Event[];
  inMonth: boolean;
  today: boolean;
  weekend: boolean;
  isHighlighted: boolean;
  monthTheme: ReturnType<typeof getMonthTheme>;
  members: HouseholdMember[];
  highlight: Highlight;
  onTap: (day: Date) => void;
  onLongPress: (day: Date) => void;
  getMemberForEvent: (event: Event) => HouseholdMember | undefined;
}

const DayCell = ({ day, dateStr, dayEvents, inMonth, today, weekend, isHighlighted, monthTheme, members, highlight, onTap, onLongPress, getMemberForEvent }: DayCellProps) => {
  const { longPressHandlers, didFire } = useLongPress({
    onLongPress: () => onLongPress(day),
  });

  const handleClick = () => {
    if (didFire()) return; // long-press already fired
    onTap(day);
  };

  return (
    <button
      {...longPressHandlers}
      onClick={handleClick}
      className={`relative flex flex-col items-center justify-start pt-1 rounded-2xl transition-all duration-200 min-h-[60px] ${
        !inMonth ? 'opacity-25' : ''
      } ${isHighlighted ? 'ring-2 ring-primary/50 animate-pulse' : ''}`}
      style={
        !today && inMonth
          ? { '--hover-bg': monthTheme.light } as React.CSSProperties
          : undefined
      }
      onMouseEnter={(e) => {
        if (!today && inMonth) (e.currentTarget as HTMLElement).style.backgroundColor = monthTheme.light;
      }}
      onMouseLeave={(e) => {
        if (!today && inMonth) (e.currentTarget as HTMLElement).style.backgroundColor = '';
      }}
    >
      <span
        className={`w-9 h-9 flex items-center justify-center rounded-full text-[15px] font-semibold transition-all duration-200 ${
          weekend && inMonth && !today ? 'opacity-60' : ''
        }`}
        style={
          today
            ? { border: '2px solid hsl(340, 55%, 68%)', color: 'hsl(340, 55%, 58%)' }
            : undefined
        }
      >
        {format(day, 'd')}
      </span>
      {dayEvents.length > 0 && (
        <div className="flex flex-col gap-0.5 mt-1 w-full px-1">
          {dayEvents
            .sort((a, b) => {
              const aCat = a.category === 'important' ? 0 : 1;
              const bCat = b.category === 'important' ? 0 : 1;
              return aCat - bCat;
            })
            .slice(0, 2)
            .map((ev) => {
              const member = getMemberForEvent(ev);
              const meta = EVENT_CATEGORY_META[(ev.category as keyof typeof EVENT_CATEGORY_META) || 'other'];
              const visuals = resolveCategoryVisuals(ev.category, getMemberColorMap(member));
              const evHighlighted = highlight && highlight.eventId === ev.id;
              const Icon = meta?.Icon;
              if (Icon) {
                return (
                  <div key={ev.id} className={`flex items-center justify-center ${evHighlighted ? 'animate-pulse' : ''}`}>
                    <Icon size={16} strokeWidth={2.5} className={visuals.iconColor} />
                  </div>
                );
              }
              const fallback = member ? getMemberColor(member.color_token) : getMemberColor('pastel-blue');
              const firstWord = ev.title.split(' ')[0] || ev.title;
              return (
                <div key={ev.id} className={`${fallback.bg} rounded-full px-2 py-0.5 text-[10px] font-medium text-center truncate leading-tight ${evHighlighted ? 'ring-2 ring-primary/50 animate-pulse' : ''}`}>
                  {firstWord}
                </div>
              );
            })}
          {dayEvents.length > 2 && (
            <div className="text-[9px] text-muted-foreground text-center font-medium">
              +{dayEvents.length - 2}
            </div>
          )}
        </div>
      )}
    </button>
  );
};

const YearView = ({ year, onSelectMonth, onBack, onChangeYear }: { year: number; onSelectMonth: (m: number) => void; onBack: () => void; onChangeYear: (y: number) => void }) => {
  const months = Array.from({ length: 12 }, (_, i) => i);
  const now = new Date();
  const theme = getMonthTheme(new Date(year, 0, 1));

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full"
    >
      <ViewHeader
        variant="calendar"
        onPrev={() => onChangeYear(year - 1)}
        onNext={() => onChangeYear(year + 1)}
        onTitleClick={onBack}
        calendarStyle={{ background: theme.gradient }}
      >
        {year}
      </ViewHeader>

      <div className="grid grid-cols-3 gap-4 px-5 pt-4 flex-1 content-start">
        {months.map((m) => {
          const theme = getMonthTheme(new Date(year, m, 1));
          const isCurrentMonth = now.getFullYear() === year && now.getMonth() === m;
          return (
            <button
              key={m}
              onClick={() => onSelectMonth(m)}
              className={`rounded-2xl py-4 text-center transition-all duration-200 hover:scale-105 ${
                isCurrentMonth ? 'ring-2 ring-offset-2' : ''
              }`}
              style={{
                backgroundColor: theme.light,
                ...(isCurrentMonth ? { ringColor: theme.dark, borderColor: theme.dark } : {}),
              }}
            >
              <span className="text-sm font-semibold capitalize" style={{ color: theme.dark }}>
                {format(new Date(year, m, 1), 'MMM', { locale: nb })}
              </span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};

export default CalendarView;
