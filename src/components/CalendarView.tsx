import { useState, useMemo, useCallback, useRef, useEffect, type Dispatch, type SetStateAction } from 'react';
import { motion, AnimatePresence, useMotionValue, animate, type PanInfo } from 'framer-motion';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isWeekend, isSameMonth, addMonths, subMonths } from 'date-fns';
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

/** Commit when dragged past this fraction of width, or with enough velocity */
const COMMIT_RATIO = 0.22;
const COMMIT_VELOCITY = 550;

function buildEventsByDate(events: Event[]): Record<string, Event[]> {
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
}

function buildMonthDays(monthDate: Date): Date[] {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  return eachDayOfInterval({ start: calStart, end: calEnd });
}

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
  const [showYear, setShowYear] = useState(false);
  const [daySheetDate, setDaySheetDate] = useState<Date | null>(null);
  const [detailEvent, setDetailEvent] = useState<Event | null>(null);
  const [paging, setPaging] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const prevDate = useMemo(() => startOfMonth(subMonths(currentDate, 1)), [currentDate]);
  const nextDate = useMemo(() => startOfMonth(addMonths(currentDate, 1)), [currentDate]);

  // Prefetch neighbours so peek never looks empty
  const { data: prevEvents = [] } = useEventsForMonth(householdId, prevDate.getFullYear(), prevDate.getMonth());
  const { data: events = [] } = useEventsForMonth(householdId, year, month);
  const { data: nextEvents = [] } = useEventsForMonth(householdId, nextDate.getFullYear(), nextDate.getMonth());

  const monthTheme = useMemo(() => getMonthTheme(currentDate), [currentDate]);

  const prevByDate = useMemo(() => buildEventsByDate(prevEvents), [prevEvents]);
  const eventsByDate = useMemo(() => buildEventsByDate(events), [events]);
  const nextByDate = useMemo(() => buildEventsByDate(nextEvents), [nextEvents]);

  const prevDays = useMemo(() => buildMonthDays(prevDate), [prevDate]);
  const days = useMemo(() => buildMonthDays(currentDate), [currentDate]);
  const nextDays = useMemo(() => buildMonthDays(nextDate), [nextDate]);

  const trackRef = useRef<HTMLDivElement>(null);
  const [pageWidth, setPageWidth] = useState(0);
  const x = useMotionValue(0);
  const animatingRef = useRef(false);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => setPageWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Reset strip when month changes externally (header / today)
  useEffect(() => {
    x.set(0);
    animatingRef.current = false;
    setPaging(false);
  }, [year, month, x]);

  const snapSpring = { type: 'spring' as const, stiffness: 520, damping: 42, mass: 0.55 };

  const commitMonth = useCallback(
    (dir: 1 | -1) => {
      if (!pageWidth || animatingRef.current) return;
      animatingRef.current = true;
      setPaging(true);
      // Strip is anchored with left: -pageWidth (middle month centered).
      // Next → slide left; prev → slide right.
      const target = dir > 0 ? -pageWidth : pageWidth;
      animate(x, target, {
        ...snapSpring,
        onComplete: () => {
          setCurrentDate((d) => (dir > 0 ? addMonths(d, 1) : subMonths(d, 1)));
          x.set(0);
          animatingRef.current = false;
          setPaging(false);
        },
      });
    },
    [pageWidth, setCurrentDate, x],
  );

  const navigate = useCallback(
    (dir: number) => {
      if (dir === 0) return;
      commitMonth(dir > 0 ? 1 : -1);
    },
    [commitMonth],
  );

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (!pageWidth || animatingRef.current) return;
    const dx = info.offset.x;
    const vx = info.velocity.x;
    const passed = Math.abs(dx) > pageWidth * COMMIT_RATIO || Math.abs(vx) > COMMIT_VELOCITY;

    if (passed) {
      // Swipe left (negative x) → next month
      const dir: 1 | -1 = dx + vx * 0.08 < 0 ? 1 : -1;
      commitMonth(dir);
    } else {
      animatingRef.current = true;
      animate(x, 0, {
        ...snapSpring,
        onComplete: () => {
          animatingRef.current = false;
        },
      });
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
    setCurrentDate(new Date());
  };

  const daySheetEvents = daySheetDate
    ? eventsByDate[format(daySheetDate, 'yyyy-MM-dd')] || []
    : [];

  return (
    <>
      <div className="flex flex-col h-full min-h-0">
        {/* Month header peeks with the same x as the day grid */}
        <div className="relative rounded-b-3xl overflow-hidden shrink-0">
          <div className="relative h-[4.25rem] overflow-hidden">
            <motion.div
              className="absolute top-0 bottom-0 flex will-change-transform"
              style={{
                x,
                width: pageWidth ? pageWidth * 3 : '300%',
                left: pageWidth ? -pageWidth : '-100%',
              }}
            >
              <MonthHeaderPanel
                width={pageWidth}
                label={format(prevDate, 'MMMM yyyy', { locale: nb })}
                gradient={getMonthTheme(prevDate).gradient}
              />
              <MonthHeaderPanel
                width={pageWidth}
                label={format(currentDate, 'MMMM yyyy', { locale: nb })}
                gradient={monthTheme.gradient}
                onTitleClick={() => setShowYear(true)}
              />
              <MonthHeaderPanel
                width={pageWidth}
                label={format(nextDate, 'MMMM yyyy', { locale: nb })}
                gradient={getMonthTheme(nextDate).gradient}
              />
            </motion.div>
          </div>

          {/* Fixed chevrons over the peeking strip */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-5">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="pointer-events-auto p-2 rounded-full hover:bg-white/15 active:scale-90 transition-all"
              aria-label="Forrige måned"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12 15L7 10L12 5" className="stroke-white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              type="button"
              onClick={() => navigate(1)}
              className="pointer-events-auto p-2 rounded-full hover:bg-white/15 active:scale-90 transition-all"
              aria-label="Neste måned"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M8 5L13 10L8 15" className="stroke-white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

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

        {/* Finger-following 3-month pager */}
        <div ref={trackRef} className="relative flex-1 min-h-0 overflow-hidden touch-pan-y">
          <motion.div
            className="absolute top-0 bottom-0 flex will-change-transform"
            style={{
              x,
              width: pageWidth ? pageWidth * 3 : '300%',
              left: pageWidth ? -pageWidth : '-100%',
            }}
            drag={paging || !pageWidth ? false : 'x'}
            dragDirectionLock
            dragConstraints={pageWidth ? { left: -pageWidth, right: pageWidth } : { left: 0, right: 0 }}
            dragElastic={0.12}
            dragMomentum={false}
            onDragEnd={handleDragEnd}
          >
            <MonthPanel
              width={pageWidth}
              monthDate={prevDate}
              days={prevDays}
              eventsByDate={prevByDate}
              monthTheme={getMonthTheme(prevDate)}
              members={members}
              highlight={highlight}
              interactive={false}
              onTap={handleDayTap}
              onLongPress={onCreateEvent}
              getMemberForEvent={getMemberForEvent}
            />
            <MonthPanel
              width={pageWidth}
              monthDate={currentDate}
              days={days}
              eventsByDate={eventsByDate}
              monthTheme={monthTheme}
              members={members}
              highlight={highlight}
              interactive={!paging}
              onTap={handleDayTap}
              onLongPress={onCreateEvent}
              getMemberForEvent={getMemberForEvent}
            />
            <MonthPanel
              width={pageWidth}
              monthDate={nextDate}
              days={nextDays}
              eventsByDate={nextByDate}
              monthTheme={getMonthTheme(nextDate)}
              members={members}
              highlight={highlight}
              interactive={false}
              onTap={handleDayTap}
              onLongPress={onCreateEvent}
              getMemberForEvent={getMemberForEvent}
            />
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {daySheetDate && (
          <CalendarDaySheet
            date={daySheetDate}
            events={daySheetEvents}
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

/* ---------- Peeking month header panel ---------- */

const MonthHeaderPanel = ({
  width,
  label,
  gradient,
  onTitleClick,
}: {
  width: number;
  label: string;
  gradient: string;
  onTitleClick?: () => void;
}) => (
  <div
    className="h-full shrink-0 flex items-center justify-center px-14"
    style={{
      width: width || '33.333%',
      background: gradient,
    }}
  >
    {onTitleClick ? (
      <button type="button" onClick={onTitleClick} className="text-center">
        <h2 className="text-xl font-extrabold capitalize text-white tracking-wide">{label}</h2>
      </button>
    ) : (
      <h2 className="text-xl font-extrabold capitalize text-white tracking-wide text-center">{label}</h2>
    )}
  </div>
);

/* ---------- Month panel ---------- */

interface MonthPanelProps {
  width: number;
  monthDate: Date;
  days: Date[];
  eventsByDate: Record<string, Event[]>;
  monthTheme: ReturnType<typeof getMonthTheme>;
  members: HouseholdMember[];
  highlight: Highlight;
  interactive: boolean;
  onTap: (day: Date) => void;
  onLongPress: (day: Date) => void;
  getMemberForEvent: (event: Event) => HouseholdMember | undefined;
}

const MonthPanel = ({
  width,
  monthDate,
  days,
  eventsByDate,
  monthTheme,
  members,
  highlight,
  interactive,
  onTap,
  onLongPress,
  getMemberForEvent,
}: MonthPanelProps) => (
  <div
    className={`grid grid-cols-7 auto-rows-[minmax(0,1fr)] gap-x-0.5 gap-y-0.5 px-3 pt-1 pb-2 content-stretch h-full min-h-0 shrink-0 ${
      interactive ? '' : 'pointer-events-none'
    }`}
    style={{ width: width || '33.333%' }}
  >
    {days.map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return (
        <DayCell
          key={dateStr}
          day={day}
          dateStr={dateStr}
          dayEvents={eventsByDate[dateStr] || []}
          inMonth={isSameMonth(day, monthDate)}
          today={isToday(day)}
          weekend={isWeekend(day)}
          isHighlighted={!!(highlight && highlight.dateStr === dateStr)}
          monthTheme={monthTheme}
          members={members}
          highlight={highlight}
          onTap={onTap}
          onLongPress={onLongPress}
          getMemberForEvent={getMemberForEvent}
        />
      );
    })}
  </div>
);

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
    if (didFire()) return;
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
