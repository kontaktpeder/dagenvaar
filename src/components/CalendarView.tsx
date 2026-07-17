import { useState, useMemo, useCallback, type Dispatch, type SetStateAction } from 'react';
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
  currentDate?: Date;
  onCurrentDateChange?: Dispatch<SetStateAction<Date>>;
  onSelectDate: (date: Date) => void;
  onCreateEvent: (date: Date) => void;
  onEditEvent?: (event: Event) => void;
  onQuickEditEvent?: (event: Event) => void;
  highlight?: Highlight;
}

const WEEKDAYS = ['man', 'tir', 'ons', 'tor', 'fre', 'lør', 'søn'];

const CATEGORY_ORDER: Record<string, number> = {
  important: 0,
  work: 1,
  couple: 2,
  celebration: 3,
  social: 4,
  travel: 5,
  other: 6,
};

const CalendarView = ({ householdId, members, currentMemberId, currentDate: controlledDate, onCurrentDateChange, onSelectDate, onCreateEvent, onEditEvent, onQuickEditEvent, highlight }: CalendarViewProps) => {
  const [internalDate, setInternalDate] = useState(new Date());
  const currentDate = controlledDate ?? internalDate;
  const setCurrentDate = useCallback(
    (updater: SetStateAction<Date>) => {
      if (onCurrentDateChange) onCurrentDateChange(updater);
      else setInternalDate(updater);
    },
    [onCurrentDateChange],
  );
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

  const [navTick, setNavTick] = useState(0);

  const navigate = useCallback((dir: number) => {
    setDirection(dir);
    setNavTick((t) => t + 1);
    setCurrentDate((d) => dir > 0 ? addMonths(d, 1) : subMonths(d, 1));
  }, [setCurrentDate]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const dx = info.offset.x;
    const vx = info.velocity.x;
    // Lower thresholds + velocity-aware = feels native and snappy.
    if (Math.abs(dx) > 40 || Math.abs(vx) > 200) {
      navigate(dx < 0 || vx < 0 ? 1 : -1);
    }
  };

  const handleDayTap = (day: Date) => {
    setDaySheetDate(day);
    onSelectDate(day);
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

  const isOnCurrentMonth = isSameMonth(currentDate, new Date());
  const goToToday = () => {
    setDirection(currentDate < new Date() ? 1 : -1);
    setCurrentDate(new Date());
  };

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
        <div className="bg-transparent relative">
          <div className="grid grid-cols-7 px-3 py-3">
            {WEEKDAYS.map((d, i) => (
              <div key={d} className={`text-center text-[13px] font-bold uppercase tracking-wider ${
                i >= 5 ? 'text-primary/60' : 'text-foreground/50'
              }`}>
                {d}
              </div>
            ))}
          </div>
          {!isOnCurrentMonth && (() => {
            const isPast = startOfMonth(currentDate) < startOfMonth(new Date());
            const positionClass = isPast
              ? 'left-1/2 -translate-x-1/2'
              : 'right-3';
            return (
              <button
                onClick={goToToday}
                className={`absolute ${positionClass} top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-full bg-muted/70 hover:bg-muted text-foreground/70 hover:text-foreground text-[10px] font-semibold uppercase tracking-wider active:scale-95 transition-all`}
              >
                I dag
              </button>
            );
          })()}
        </div>

        {/* Days grid */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={`${year}-${month}-${navTick}`}
            custom={direction}
            initial={{ x: direction * 100 + '%' }}
            animate={{ x: 0 }}
            exit={{ x: -direction * 100 + '%' }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0}
            dragMomentum={false}
            dragTransition={{ bounceStiffness: 0, bounceDamping: 100, power: 0 }}
            dragSnapToOrigin
            onDragEnd={handleDragEnd}
            className="grid grid-cols-7 auto-rows-[minmax(0,1fr)] gap-x-0.5 gap-y-0.5 px-3 flex-1 pt-1 pb-2 content-stretch touch-none overscroll-none will-change-transform min-h-0"
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
                  onLongPress={(d) => onCreateEvent(d)}
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
            householdId={householdId}
            currentMemberId={currentMemberId}
            highlight={highlight}
            onClose={() => setDaySheetDate(null)}
            onPickEvent={(ev) => {
              setDaySheetDate(null);
              setDetailEvent(ev);
            }}
            onCreateForDate={(d) => {
              setDaySheetDate(null);
              onCreateEvent(d);
            }}
            onEditEvent={onEditEvent}
            onQuickEditEvent={onQuickEditEvent}
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
            onQuickEdit={onQuickEditEvent ? (ev) => { setDetailEvent(null); onQuickEditEvent(ev); } : undefined}
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

/** Max event marks shown before +N overflow */
const MAX_VISIBLE_MARKS = 5;

type EventRow = Event[];

/** Pack events into rows: side-by-side only when same category (max 2 per row). */
function packEventRows(events: Event[], maxMarks: number): { rows: EventRow[]; overflow: number } {
  const sorted = [...events].sort((a, b) => {
    const aRank = CATEGORY_ORDER[a.category ?? 'other'] ?? 999;
    const bRank = CATEGORY_ORDER[b.category ?? 'other'] ?? 999;
    if (aRank !== bRank) return aRank - bRank;
    return (a.start_time || '').localeCompare(b.start_time || '');
  });

  const rows: EventRow[] = [];
  let shown = 0;

  for (const ev of sorted) {
    if (shown >= maxMarks) break;
    const cat = ev.category ?? 'other';
    const last = rows[rows.length - 1];
    if (
      last &&
      last.length < 2 &&
      (last[0].category ?? 'other') === cat
    ) {
      last.push(ev);
    } else {
      rows.push([ev]);
    }
    shown += 1;
  }

  return { rows, overflow: events.length - shown };
}

const DayCell = ({ day, dateStr, dayEvents, inMonth, today, weekend, isHighlighted, monthTheme, members, highlight, onTap, onLongPress, getMemberForEvent }: DayCellProps) => {
  const { longPressHandlers, didFire } = useLongPress({
    onLongPress: () => onLongPress(day),
  });

  const handleClick = () => {
    if (didFire()) return; // long-press already fired
    onTap(day);
  };

  const { rows, overflow } = packEventRows(dayEvents, MAX_VISIBLE_MARKS);

  const renderEventMark = (ev: Event) => {
    const member = getMemberForEvent(ev);
    const meta = EVENT_CATEGORY_META[(ev.category as keyof typeof EVENT_CATEGORY_META) || 'other'];
    const visuals = resolveCategoryVisuals(ev.category, getMemberColorMap(member));
    const evHighlighted = highlight && highlight.eventId === ev.id;
    const Icon = meta?.Icon;
    if (Icon) {
      return (
        <div key={ev.id} className={`flex items-center justify-center ${evHighlighted ? 'animate-pulse' : ''}`}>
          <Icon size={11} strokeWidth={2} className={visuals.iconColor} />
        </div>
      );
    }
    const fallback = member ? getMemberColor(member.color_token) : getMemberColor('pastel-blue');
    return (
      <div
        key={ev.id}
        className={`w-2 h-2 rounded-full ${fallback.bg} ${evHighlighted ? 'ring-2 ring-primary/50 animate-pulse' : ''}`}
        title={ev.title}
      />
    );
  };

  return (
    <button
      {...longPressHandlers}
      onClick={handleClick}
      className={`relative flex flex-col items-center justify-start pt-0.5 pb-0.5 px-0.5 rounded-2xl transition-all duration-200 min-h-0 h-full overflow-hidden ${
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
        className={`w-7 h-7 shrink-0 flex items-center justify-center rounded-full text-[14px] font-semibold transition-all duration-200 ${
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
      {rows.length > 0 && (
        <div className="mt-0.5 w-full flex flex-col items-center gap-px min-h-0 flex-1">
          {rows.map((row, i) => (
            <div
              key={row.map((e) => e.id).join('-') || i}
              className={`flex items-center justify-center gap-px ${row.length > 1 ? 'flex-row' : 'flex-col'}`}
            >
              {row.map((ev) => renderEventMark(ev))}
            </div>
          ))}
          {overflow > 0 && (
            <div className="text-[8px] text-muted-foreground text-center font-medium leading-none shrink-0">
              +{overflow}
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
