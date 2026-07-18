import { useState, useMemo, useCallback, useRef, useEffect, type Dispatch, type SetStateAction } from 'react';
import { motion, AnimatePresence, useMotionValue, animate, type PanInfo } from 'framer-motion';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isWeekend, isSameMonth, addMonths, subMonths } from 'date-fns';
import { nb } from 'date-fns/locale';
import { useEventsForMonth, type Event } from '@/hooks/useEvents';
import { getMemberColor } from '@/lib/colors';
import { resolveCategoryVisuals, getMemberColorMap } from '@/lib/categoryPresentation';
import { EVENT_CATEGORY_META } from '@/lib/eventCategories';
import { getMonthTheme } from '@/lib/monthTheme';
import {
  buildSpanSegmentsByDate,
  isMultiDayEvent,
  maxSpanLane,
  MAX_SPAN_LANES,
  type SpanSegment,
} from '@/lib/multiDaySpans';
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
const COMMIT_RATIO = 0.16;
const COMMIT_VELOCITY = 320;
/** Months rendered on each side of the center (5 panels total) */
const WINDOW = 2;
/** How strongly release velocity projects into month hops (symmetric both ways) */
const VELOCITY_PROJECT = 0.34;

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

  const stripOffsets = useMemo(() => Array.from({ length: WINDOW * 2 + 1 }, (_, i) => i - WINDOW), []);
  const stripDates = useMemo(
    () => stripOffsets.map((off) => startOfMonth(addMonths(currentDate, off))),
    [currentDate, stripOffsets],
  );

  // Prefetch ±WINDOW so continuous swipe never peeks empty
  const { data: eventsM2 = [] } = useEventsForMonth(householdId, stripDates[0].getFullYear(), stripDates[0].getMonth());
  const { data: eventsM1 = [] } = useEventsForMonth(householdId, stripDates[1].getFullYear(), stripDates[1].getMonth());
  const { data: events = [] } = useEventsForMonth(householdId, year, month);
  const { data: eventsP1 = [] } = useEventsForMonth(householdId, stripDates[3].getFullYear(), stripDates[3].getMonth());
  const { data: eventsP2 = [] } = useEventsForMonth(householdId, stripDates[4].getFullYear(), stripDates[4].getMonth());

  const monthTheme = useMemo(() => getMonthTheme(currentDate), [currentDate]);

  const eventsByOffset = useMemo(
    () => [eventsM2, eventsM1, events, eventsP1, eventsP2].map(buildEventsByDate),
    [eventsM2, eventsM1, events, eventsP1, eventsP2],
  );
  const eventsByDate = eventsByOffset[WINDOW];

  const daysByOffset = useMemo(
    () => stripDates.map(buildMonthDays),
    [stripDates],
  );

  const trackRef = useRef<HTMLDivElement>(null);
  const [pageWidth, setPageWidth] = useState(0);
  const x = useMotionValue(0);
  const animatingRef = useRef(false);
  const animationControlsRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => setPageWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const snapSpring = { type: 'spring' as const, stiffness: 420, damping: 38, mass: 0.55 };
  const panStartXRef = useRef(0);

  const stopPagingAnim = useCallback(() => {
    animationControlsRef.current?.stop();
    animationControlsRef.current = null;
    animatingRef.current = false;
    setPaging(false);
  }, []);

  /** Jump without strip animation (today / year picker) */
  const jumpToMonth = useCallback(
    (date: Date) => {
      stopPagingAnim();
      x.set(0);
      setCurrentDate(startOfMonth(date));
    },
    [setCurrentDate, stopPagingAnim, x],
  );

  /** Keep strip filled during pan: shift month + compensate pan origin so motion stays continuous */
  const applyLiveRecenter = useCallback(
    (nextX: number, panOrigin: { current: number }) => {
      if (!pageWidth) return nextX;
      let px = nextX;
      let hops = 0;
      while (px <= -pageWidth) {
        px += pageWidth;
        hops += 1;
        panOrigin.current += pageWidth;
      }
      while (px >= pageWidth) {
        px -= pageWidth;
        hops -= 1;
        panOrigin.current -= pageWidth;
      }
      if (hops !== 0) {
        setCurrentDate((d) => (hops > 0 ? addMonths(d, hops) : subMonths(d, -hops)));
      }
      return px;
    },
    [pageWidth, setCurrentDate],
  );

  const flingToHops = useCallback(
    (hops: number) => {
      if (!pageWidth) return;

      animatingRef.current = true;
      setPaging(true);

      if (hops === 0) {
        animationControlsRef.current = animate(x, 0, {
          ...snapSpring,
          onComplete: () => {
            animatingRef.current = false;
            setPaging(false);
            animationControlsRef.current = null;
          },
        });
        return;
      }

      // Chain one page at a time from *current* x — works equally forward and back,
      // including when reversing mid-gesture (no absolute target that fights position).
      const dir: 1 | -1 = hops > 0 ? 1 : -1;
      let remaining = Math.min(WINDOW, Math.abs(hops));

      const runHop = () => {
        const target = dir > 0 ? -pageWidth : pageWidth;
        animationControlsRef.current = animate(x, target, {
          ...snapSpring,
          onComplete: () => {
            setCurrentDate((d) => (dir > 0 ? addMonths(d, 1) : subMonths(d, 1)));
            x.set(0);
            remaining -= 1;
            if (remaining > 0) {
              runHop();
            } else {
              animatingRef.current = false;
              setPaging(false);
              animationControlsRef.current = null;
            }
          },
        });
      };

      runHop();
    },
    [pageWidth, setCurrentDate, x],
  );

  const handlePanStart = () => {
    stopPagingAnim();
    panStartXRef.current = x.get();
    setPaging(true);
  };

  const handlePan = (_: unknown, info: PanInfo) => {
    if (!pageWidth) return;
    const raw = panStartXRef.current + info.offset.x;
    x.set(applyLiveRecenter(raw, panStartXRef));
  };

  const handlePanEnd = (_: unknown, info: PanInfo) => {
    if (!pageWidth) return;

    const px = x.get();
    const vx = info.velocity.x;
    const projected = px + vx * VELOCITY_PROJECT;
    let hops = Math.round(-projected / pageWidth);

    if (hops === 0) {
      const flicked = Math.abs(vx) > COMMIT_VELOCITY;
      const dragged = Math.abs(px) > pageWidth * COMMIT_RATIO;
      if (flicked || dragged) {
        // Prefer velocity when it's a clear flick; otherwise use drag position.
        // Same rule both directions — avoids reverse flicks springing back to center.
        if (flicked && Math.abs(vx) >= Math.abs(px) * 2.5) {
          hops = vx < 0 ? 1 : -1;
        } else {
          hops = px < 0 ? 1 : -1;
        }
      }
    }

    hops = Math.max(-WINDOW, Math.min(WINDOW, hops));
    flingToHops(hops);
  };

  const handleDayTap = (day: Date) => {
    setDaySheetDate(day);
    onSelectDate(day);
  };

  const getMemberForEvent = (event: Event) => {
    return members.find((m) => m.id === event.owner_member_id);
  };

  const openYearView = () => {
    stopPagingAnim();
    x.set(0);
    setShowYear(true);
  };

  const closeYearView = () => {
    stopPagingAnim();
    x.set(0);
    setShowYear(false);
  };

  const isOnCurrentMonth = isSameMonth(currentDate, new Date());
  const goToToday = () => {
    jumpToMonth(new Date());
  };

  const daySheetEvents = daySheetDate
    ? eventsByDate[format(daySheetDate, 'yyyy-MM-dd')] || []
    : [];

  return (
    <>
      <div className="relative flex flex-col h-full min-h-0">
        <div className={`flex flex-col h-full min-h-0 ${showYear ? 'invisible pointer-events-none' : ''}`}>
        {/* Month header peeks with the same x as the day grid */}
        <div className="relative rounded-b-3xl overflow-hidden shrink-0">
          <div className="relative h-[4.25rem] overflow-hidden">
            <motion.div
              className="absolute top-0 bottom-0 flex will-change-transform"
              style={{
                x,
                width: pageWidth ? pageWidth * (WINDOW * 2 + 1) : '500%',
                left: pageWidth ? -pageWidth * WINDOW : '-200%',
              }}
            >
              {stripDates.map((date, i) => (
                <MonthHeaderPanel
                  key={`${date.getFullYear()}-${date.getMonth()}`}
                  width={pageWidth}
                  label={format(date, 'MMMM yyyy', { locale: nb })}
                  gradient={i === WINDOW ? monthTheme.gradient : getMonthTheme(date).gradient}
                  onTitleClick={i === WINDOW ? openYearView : undefined}
                />
              ))}
            </motion.div>
          </div>

          {!isOnCurrentMonth && (
            <button
              type="button"
              onClick={goToToday}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 px-2.5 py-1 rounded-full bg-white/25 hover:bg-white/35 text-white text-[10px] font-semibold uppercase tracking-wider active:scale-95 transition-all backdrop-blur-sm"
            >
              I dag
            </button>
          )}
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
        </div>

        {/* Continuous infinite-feel month strip */}
        <div ref={trackRef} className="relative flex-1 min-h-0 overflow-hidden touch-none">
          <motion.div
            className="absolute top-0 bottom-0 flex will-change-transform"
            style={{
              x,
              width: pageWidth ? pageWidth * (WINDOW * 2 + 1) : '500%',
              left: pageWidth ? -pageWidth * WINDOW : '-200%',
              touchAction: 'pan-x',
            }}
            onPanStart={showYear ? undefined : handlePanStart}
            onPan={showYear ? undefined : handlePan}
            onPanEnd={showYear ? undefined : handlePanEnd}
          >
            {stripDates.map((date, i) => {
              const byDate = eventsByOffset[i];
              const neighbour = {
                ...(eventsByOffset[i - 1] || {}),
                ...(eventsByOffset[i + 1] || {}),
              };
              return (
                <MonthPanel
                  key={`${date.getFullYear()}-${date.getMonth()}`}
                  width={pageWidth}
                  monthDate={date}
                  days={daysByOffset[i]}
                  eventsByDate={byDate}
                  neighbourEventsByDate={neighbour}
                  monthTheme={i === WINDOW ? monthTheme : getMonthTheme(date)}
                  members={members}
                  highlight={highlight}
                  interactive={i === WINDOW && !paging}
                  onTap={handleDayTap}
                  onLongPress={onCreateEvent}
                  getMemberForEvent={getMemberForEvent}
                />
              );
            })}
          </motion.div>
        </div>
        </div>

        <AnimatePresence>
          {showYear && (
            <motion.div
              key="year-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 z-30 bg-background flex flex-col"
            >
              <YearView
                year={year}
                onSelectMonth={(m) => {
                  jumpToMonth(new Date(year, m, 1));
                  closeYearView();
                }}
                onBack={closeYearView}
                onChangeYear={(y) => jumpToMonth(new Date(y, month, 1))}
              />
            </motion.div>
          )}
        </AnimatePresence>
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
              // Keep day sheet under detail — backdrop pops one level
              setDetailEvent(ev);
            }}
            onCreateForDate={(d) => {
              // Keep day sheet under create flow
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
            onEdit={onEditEvent ? (ev) => { onEditEvent(ev); } : undefined}
            onQuickEdit={onQuickEditEvent ? (ev) => { onQuickEditEvent(ev); } : undefined}
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
    className="h-full shrink-0 flex items-center justify-center px-5"
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
  /** Events from adjacent months so padding days stay filled */
  neighbourEventsByDate?: Record<string, Event[]>;
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
  neighbourEventsByDate,
  monthTheme,
  members,
  highlight,
  interactive,
  onTap,
  onLongPress,
  getMemberForEvent,
}: MonthPanelProps) => {
  const spanByDate = useMemo(
    () => buildSpanSegmentsByDate(days, eventsByDate, neighbourEventsByDate),
    [days, eventsByDate, neighbourEventsByDate],
  );

  return (
    <div
      className={`grid grid-cols-7 auto-rows-[minmax(0,1fr)] gap-x-0.5 gap-y-0.5 px-3 pt-1 pb-2 content-stretch h-full min-h-0 shrink-0 ${
        interactive ? '' : 'pointer-events-none'
      }`}
      style={{ width: width || '33.333%' }}
    >
      {days.map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const inMonth = isSameMonth(day, monthDate);
        const allDayEvents = eventsByDate[dateStr] || neighbourEventsByDate?.[dateStr] || [];
        const dayEvents = allDayEvents.filter((ev) => !isMultiDayEvent(ev));
        const spanSegments = spanByDate.get(dateStr) || [];
        return (
          <DayCell
            key={dateStr}
            day={day}
            dateStr={dateStr}
            dayEvents={dayEvents}
            spanSegments={spanSegments}
            inMonth={inMonth}
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
};

/* ---------- DayCell with long-press ---------- */

interface DayCellProps {
  day: Date;
  dateStr: string;
  dayEvents: Event[];
  spanSegments: SpanSegment[];
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

/** Max single-day marks shown before +N overflow */
const MAX_VISIBLE_MARKS = 4;
/** Shared calendar mark size — single-day icons and multi-day rail icons */
const CAL_ICON_SIZE = 11;
const CAL_ICON_STROKE = 2;
/** Chip / rail — roomy pastell bak ikonet; samme høyde for endags og flerdagers */
const MARK_CHIP = 'w-[17px] h-[17px]';
const SPAN_RAIL_H = 'h-[17px]';

/** Pack single-day icons: side-by-side only when same category (max 2 per row). */
function packEventRows(events: Event[], maxMarks: number): { rows: Event[][]; overflow: number } {
  const sorted = [...events].sort((a, b) => {
    const aRank = CATEGORY_ORDER[a.category ?? 'other'] ?? 999;
    const bRank = CATEGORY_ORDER[b.category ?? 'other'] ?? 999;
    if (aRank !== bRank) return aRank - bRank;
    return (a.start_time || '').localeCompare(b.start_time || '');
  });

  const rows: Event[][] = [];
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

const DayCell = ({
  day,
  dateStr,
  dayEvents,
  spanSegments,
  inMonth: _inMonth,
  today,
  weekend,
  isHighlighted,
  monthTheme,
  members: _members,
  highlight,
  onTap,
  onLongPress,
  getMemberForEvent,
}: DayCellProps) => {
  const { longPressHandlers, didFire } = useLongPress({
    onLongPress: () => onLongPress(day),
  });

  const handleClick = () => {
    if (didFire()) return;
    onTap(day);
  };

  const { rows, overflow } = packEventRows(dayEvents, MAX_VISIBLE_MARKS);
  const laneCount = Math.max(maxSpanLane(spanSegments) + 1, 0);
  const spanByLane = new Map(spanSegments.map((s) => [s.lane, s]));

  const renderEventMark = (ev: Event) => {
    const member = getMemberForEvent(ev);
    const meta = EVENT_CATEGORY_META[(ev.category as keyof typeof EVENT_CATEGORY_META) || 'other'];
    const visuals = resolveCategoryVisuals(ev.category, getMemberColorMap(member));
    const evHighlighted = highlight && highlight.eventId === ev.id;
    const Icon = meta?.Icon;
    if (Icon) {
      return (
        <div
          key={ev.id}
          title={ev.title}
          className={`${MARK_CHIP} rounded-full flex items-center justify-center ${visuals.railBg} ${
            evHighlighted ? 'ring-1 ring-primary/50 animate-pulse' : ''
          }`}
        >
          <Icon size={CAL_ICON_SIZE} strokeWidth={CAL_ICON_STROKE} className={visuals.iconColor} />
        </div>
      );
    }
    const fallback = member ? getMemberColor(member.color_token) : getMemberColor('pastel-blue');
    return (
      <div
        key={ev.id}
        className={`${MARK_CHIP} rounded-full ${fallback.bg} ${evHighlighted ? 'ring-1 ring-primary/50 animate-pulse' : ''}`}
        title={ev.title}
      />
    );
  };

  return (
    <button
      {...longPressHandlers}
      onClick={handleClick}
      className={`relative flex flex-col items-center justify-start pt-0.5 pb-0.5 px-0 rounded-2xl transition-all duration-200 min-h-0 h-full overflow-visible ${
        isHighlighted ? 'ring-2 ring-primary/50 animate-pulse' : ''
      }`}
      style={
        !today
          ? { '--hover-bg': monthTheme.light } as React.CSSProperties
          : undefined
      }
      onMouseEnter={(e) => {
        if (!today) (e.currentTarget as HTMLElement).style.backgroundColor = monthTheme.light;
      }}
      onMouseLeave={(e) => {
        if (!today) (e.currentTarget as HTMLElement).style.backgroundColor = '';
      }}
    >
      <span
        className={`w-7 h-7 shrink-0 flex items-center justify-center rounded-full text-[14px] font-semibold transition-all duration-200 ${
          weekend && !today ? 'opacity-60' : ''
        }`}
        style={
          today
            ? { border: '2px solid hsl(340, 55%, 68%)', color: 'hsl(340, 55%, 58%)' }
            : undefined
        }
      >
        {format(day, 'd')}
      </span>

      {/* Pastel multi-day rails — stacked lanes; start icon centered under date */}
      {laneCount > 0 && (
        <div className="mt-0.5 w-full flex flex-col gap-0.5 px-0 shrink-0 z-[1]">
          {Array.from({ length: Math.min(laneCount, MAX_SPAN_LANES) }, (_, lane) => {
            const seg = spanByLane.get(lane);
            if (!seg) {
              return <div key={`lane-${lane}`} className={`${SPAN_RAIL_H} w-full`} aria-hidden />;
            }
            const member = getMemberForEvent(seg.event);
            const visuals = resolveCategoryVisuals(seg.event.category, getMemberColorMap(member));
            const meta = EVENT_CATEGORY_META[(seg.event.category as keyof typeof EVENT_CATEGORY_META) || 'other'];
            const Icon = meta?.Icon;
            const evHighlighted = highlight && highlight.eventId === seg.event.id;

            // Bridge gap-x-0.5; absolute so start icon can stay centered under the date
            let railPos = 'left-0 right-0';
            if (seg.isStart && seg.isEnd) railPos = 'left-px right-px';
            else if (seg.isStart) railPos = 'left-0 right-[-2px]';
            else if (seg.isEnd) railPos = 'left-[-2px] right-0';
            else railPos = 'left-[-2px] right-[-2px]';

            return (
              <div
                key={seg.event.id}
                title={seg.event.title}
                className={`relative ${SPAN_RAIL_H} w-full flex items-center justify-center ${
                  evHighlighted ? 'animate-pulse' : ''
                }`}
              >
                <div
                  aria-hidden
                  className={`absolute inset-y-0 ${railPos} ${visuals.railBg} ${
                    seg.isStart ? 'rounded-l-full' : ''
                  } ${seg.isEnd ? 'rounded-r-full' : ''} ${
                    evHighlighted ? 'ring-1 ring-primary/50' : ''
                  }`}
                />
                {seg.isStart && Icon && (
                  <span
                    className={`relative z-[1] ${MARK_CHIP} shrink-0 rounded-full flex items-center justify-center`}
                  >
                    <Icon
                      size={CAL_ICON_SIZE}
                      strokeWidth={CAL_ICON_STROKE}
                      className={visuals.iconColor}
                    />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-0.5 w-full flex flex-col items-center gap-px min-h-0 flex-1 px-0.5">
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
    <div className="flex flex-col h-full min-h-0">
      <ViewHeader
        variant="calendar"
        onPrev={() => onChangeYear(year - 1)}
        onNext={() => onChangeYear(year + 1)}
        onTitleClick={onBack}
        calendarStyle={{ background: theme.gradient }}
      >
        {year}
      </ViewHeader>

      <div className="grid grid-cols-3 gap-4 px-5 pt-4 flex-1 content-start overflow-y-auto">
        {months.map((m) => {
          const theme = getMonthTheme(new Date(year, m, 1));
          const isCurrentMonth = now.getFullYear() === year && now.getMonth() === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => onSelectMonth(m)}
              className={`rounded-2xl py-4 text-center transition-all duration-200 active:scale-95 ${
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
    </div>
  );
};

export default CalendarView;
