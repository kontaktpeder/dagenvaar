import { useState, useMemo, useCallback, useRef, useEffect, type Dispatch, type SetStateAction } from 'react';
import { motion, AnimatePresence, useMotionValue, animate, type PanInfo } from 'framer-motion';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isWeekend, isSameMonth, addMonths, subMonths } from 'date-fns';
import { useEventsForMonth, type Event } from '@/hooks/useEvents';
import {
  mergeEventsWithOverlays,
  useOverlayEventsForRange,
  type DisplayEvent,
} from '@/hooks/useOverlayEvents';
import { useActiveCountdowns, type CountdownWithParticipants } from '@/hooks/useCountdowns';
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
import { targetDateStr } from '@/lib/countdownTime';
import type { HouseholdMember } from '@/hooks/useHousehold';
import type { Highlight } from '@/pages/Index';
import { useLocale } from '@/hooks/useLocale';
import type { CalendarKind } from '@/lib/calendarKinds';
import ViewHeader from '@/components/ViewHeader';
import CalendarDaySheet from '@/components/CalendarDaySheet';
import EventDetailSheet from '@/components/EventDetailSheet';
import OverlayEventSheet from '@/components/OverlayEventSheet';
import CountdownDetailSheet from '@/components/CountdownDetailSheet';
import { useLongPress } from '@/hooks/useLongPress';
import { useIsMobile } from '@/hooks/use-mobile';
import { fadeQuick } from '@/lib/motion';
import { consumePendingOpenDay, subscribePendingOpenDay } from '@/lib/native/pendingOpenDay';
import {
  consumePendingOpenCountdown,
  peekPendingOpenCountdown,
  subscribePendingOpenCountdown,
} from '@/lib/native/pendingOpenCountdown';

interface CalendarViewProps {
  householdId: string;
  members: HouseholdMember[];
  currentMemberId: string;
  calendarKind?: CalendarKind | string;
  currentDate?: Date;
  onCurrentDateChange?: Dispatch<SetStateAction<Date>>;
  onSelectDate: (date: Date) => void;
  onCreateEvent: (date: Date) => void;
  onCreateCountdown?: (date: Date) => void;
  onEditEvent?: (event: Event) => void;
  onQuickEditEvent?: (event: Event) => void;
  onSwitchCalendar?: (householdId: string) => void;
  /** Vertical stack: +1 = swipe up (next), -1 = swipe down (previous) */
  onSwipeCalendarStack?: (direction: 1 | -1) => void;
  canSwipeCalendarStack?: boolean;
  highlight?: Highlight;
  canSeedWeek?: boolean;
  onSeedWeek?: () => void;
}

const WEEKDAYS = ['man', 'tir', 'ons', 'tor', 'fre', 'lør', 'søn'];

const CATEGORY_ORDER: Record<string, number> = {
  important: 0,
  deadline: 1,
  work: 2,
  meeting: 3,
  client: 4,
  focus: 5,
  admin: 6,
  couple: 7,
  celebration: 8,
  social: 9,
  travel: 10,
  other: 11,
};

/** Commit when dragged past this fraction of width, or with enough velocity */
const COMMIT_RATIO = 0.18;
const COMMIT_VELOCITY = 380;
/** Vertical stack switch thresholds */
const STACK_COMMIT_PX = 64;
const STACK_COMMIT_VELOCITY = 420;
/** Months rendered on each side of the center (5 panels total) */
const WINDOW = 2;
/** One gesture = at most one month */
const MAX_HOPS_PER_SWIPE = 1;
/** Soft resistance past one page (rubber-band) — avoids hard edge blink */
const RUBBER = 0.28;
/** Ignore strip movement until finger travels this far (px) */
const PAN_ACTIVATE_PX = 14;
/** Treat gesture as vertical (stack) when |dy| exceeds |dx| by this factor */
const AXIS_LOCK_RATIO = 1.15;

/** Diminishing travel past ±limit so the strip never hard-stops / blinks at the edge */
function rubberBand(offset: number, limit: number): number {
  const sign = offset < 0 ? -1 : 1;
  const abs = Math.abs(offset);
  if (abs <= limit) return offset;
  return sign * (limit + (abs - limit) * RUBBER);
}

function buildEventsByDate(events: DisplayEvent[]): Record<string, DisplayEvent[]> {
  const map: Record<string, DisplayEvent[]> = {};
  events.forEach((e) => {
    const start = e.event_date;
    const end = e.end_date || e.event_date;
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

function eventsForMonth(
  all: DisplayEvent[],
  year: number,
  month: number,
): DisplayEvent[] {
  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return all.filter((e) => {
    const end = e.end_date || e.event_date;
    return e.event_date <= monthEnd && end >= monthStart;
  });
}

function buildMonthDays(monthDate: Date): Date[] {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  return eachDayOfInterval({ start: calStart, end: calEnd });
}

const CalendarView = ({ householdId, members, currentMemberId, calendarKind = 'home', currentDate: controlledDate, onCurrentDateChange, onSelectDate, onCreateEvent, onCreateCountdown, onEditEvent, onQuickEditEvent, onSwitchCalendar, onSwipeCalendarStack, canSwipeCalendarStack = false, highlight, canSeedWeek = false, onSeedWeek }: CalendarViewProps) => {
  const { dateLocale } = useLocale();
  const isMobile = useIsMobile();
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
  const [overlayEvent, setOverlayEvent] = useState<DisplayEvent | null>(null);
  const [detailCountdown, setDetailCountdown] = useState<CountdownWithParticipants | null>(null);
  const [paging, setPaging] = useState(false);
  const { data: activeCountdowns = [] } = useActiveCountdowns(householdId);

  const countdownsByDate = useMemo(() => {
    const map: Record<string, CountdownWithParticipants[]> = {};
    for (const cd of activeCountdowns) {
      const key = targetDateStr(cd.target_at);
      (map[key] ??= []).push(cd);
    }
    return map;
  }, [activeCountdowns]);

  const countdownEmojiByDate = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [key, list] of Object.entries(countdownsByDate)) {
      map[key] = list[0]?.emoji || '✨';
    }
    return map;
  }, [countdownsByDate]);

  const openDayFromPush = useCallback(
    (dateStr: string) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      if (!y || !m || !d) return;
      const day = new Date(y, m - 1, d);
      setCurrentDate(startOfMonth(day));
      onSelectDate?.(day);
      setDaySheetDate(day);
    },
    [onSelectDate, setCurrentDate],
  );

  useEffect(() => {
    const pending = consumePendingOpenDay();
    if (pending) openDayFromPush(pending);
    return subscribePendingOpenDay(openDayFromPush);
  }, [openDayFromPush]);

  const openCountdownFromPush = useCallback(
    (countdownId: string) => {
      const cd = activeCountdowns.find((c) => c.id === countdownId);
      if (!cd) return false;
      consumePendingOpenCountdown();
      openDayFromPush(targetDateStr(cd.target_at));
      setDetailCountdown(cd);
      return true;
    },
    [activeCountdowns, openDayFromPush],
  );

  useEffect(() => {
    const pending = peekPendingOpenCountdown();
    if (pending) openCountdownFromPush(pending);
    return subscribePendingOpenCountdown((id) => {
      openCountdownFromPush(id);
    });
  }, [openCountdownFromPush]);

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

  const overlayRange = useMemo(() => {
    const start = format(startOfMonth(stripDates[0]), 'yyyy-MM-dd');
    const end = format(endOfMonth(stripDates[stripDates.length - 1]), 'yyyy-MM-dd');
    return { start, end };
  }, [stripDates]);

  const { data: overlayEvents = [] } = useOverlayEventsForRange(
    householdId,
    overlayRange.start,
    overlayRange.end,
  );

  const monthTheme = useMemo(() => getMonthTheme(currentDate), [currentDate]);

  const mergedByOffset = useMemo(() => {
    const locals = [eventsM2, eventsM1, events, eventsP1, eventsP2];
    return locals.map((local, i) => {
      const y = stripDates[i].getFullYear();
      const m = stripDates[i].getMonth();
      const monthOverlays = eventsForMonth(overlayEvents, y, m);
      return mergeEventsWithOverlays(local, monthOverlays);
    });
  }, [eventsM2, eventsM1, events, eventsP1, eventsP2, overlayEvents, stripDates]);

  const eventsByOffset = useMemo(
    () => mergedByOffset.map(buildEventsByDate),
    [mergedByOffset],
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
  const panStartXRef = useRef(0);
  /** pending = undecided, pan = horizontal month, stack = vertical calendar switch, blocked = press lock */
  const panModeRef = useRef<'pending' | 'pan' | 'stack' | 'blocked'>('pending');
  /** Set while a day long-press is active — keeps strip frozen */
  const pressLockRef = useRef(false);
  /** Track vertical intent for calendar-stack swipe */
  const panOffsetYRef = useRef(0);
  const panVelocityYRef = useRef(0);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => setPageWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const stopPagingAnim = useCallback(() => {
    animationControlsRef.current?.stop();
    animationControlsRef.current = null;
    if (animatingRef.current) {
      animatingRef.current = false;
      setPaging(false);
    }
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

  const lockStripForPress = useCallback(() => {
    pressLockRef.current = true;
    panModeRef.current = 'blocked';
    x.set(panStartXRef.current);
  }, [x]);

  const unlockStripForPress = useCallback(() => {
    pressLockRef.current = false;
  }, []);

  const flingToHops = useCallback(
    (hops: number) => {
      if (!pageWidth) return;

      const clamped = Math.max(-MAX_HOPS_PER_SWIPE, Math.min(MAX_HOPS_PER_SWIPE, hops));
      animatingRef.current = true;
      // Don't flip pointer-events mid-settle — that remounts cells and blinks at the edge
      setPaging(true);

      const settle = {
        type: 'tween' as const,
        duration: 0.28,
        ease: [0.32, 0.72, 0, 1] as [number, number, number, number],
      };

      if (clamped === 0) {
        animationControlsRef.current = animate(x, 0, {
          ...settle,
          onComplete: () => {
            animatingRef.current = false;
            setPaging(false);
            animationControlsRef.current = null;
          },
        });
        return;
      }

      // Animate to exact one page, then recenter instantly (new center == old neighbor)
      animationControlsRef.current = animate(x, -clamped * pageWidth, {
        ...settle,
        onComplete: () => {
          setCurrentDate((d) => addMonths(d, clamped));
          x.set(0);
          animatingRef.current = false;
          setPaging(false);
          animationControlsRef.current = null;
        },
      });
    },
    [pageWidth, setCurrentDate, x],
  );

  const handlePanStart = () => {
    stopPagingAnim();
    panStartXRef.current = x.get();
    panModeRef.current = pressLockRef.current ? 'blocked' : 'pending';
    panOffsetYRef.current = 0;
    panVelocityYRef.current = 0;
  };

  const handlePan = (_: unknown, info: PanInfo) => {
    if (!pageWidth) return;

    panOffsetYRef.current = info.offset.y;
    panVelocityYRef.current = info.velocity.y;

    if (pressLockRef.current || panModeRef.current === 'blocked') {
      x.set(panStartXRef.current);
      return;
    }

    if (panModeRef.current === 'stack') {
      x.set(panStartXRef.current);
      return;
    }

    const dx = info.offset.x;
    const dy = info.offset.y;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    if (panModeRef.current === 'pending') {
      if (adx < PAN_ACTIVATE_PX && ady < PAN_ACTIVATE_PX) {
        x.set(panStartXRef.current);
        return;
      }
      // Vertical wins → calendar stack (same gesture model on iOS + Android)
      if (ady >= PAN_ACTIVATE_PX && ady > adx * AXIS_LOCK_RATIO) {
        panModeRef.current = canSwipeCalendarStack ? 'stack' : 'blocked';
        x.set(panStartXRef.current);
        return;
      }
      if (adx < PAN_ACTIVATE_PX) {
        x.set(panStartXRef.current);
        return;
      }
      panModeRef.current = 'pan';
    }

    // Follow finger within ±1 page; soft rubber past that (no hard blink wall)
    const raw = panStartXRef.current + dx;
    x.set(rubberBand(raw, pageWidth));
  };

  const handlePanEnd = (_: unknown, info: PanInfo) => {
    if (!pageWidth) return;

    const wasPanning = panModeRef.current === 'pan' && !pressLockRef.current;
    const wasVerticalStack = panModeRef.current === 'stack' && !pressLockRef.current;
    const dy = info.offset.y || panOffsetYRef.current;
    const vy = info.velocity.y || panVelocityYRef.current;
    panModeRef.current = 'pending';

    if (wasVerticalStack && onSwipeCalendarStack) {
      const flicked = Math.abs(vy) > STACK_COMMIT_VELOCITY;
      const dragged = Math.abs(dy) > STACK_COMMIT_PX;
      if (flicked || dragged) {
        // Finger up → content moves up → next calendar below
        if (dy < 0 || (flicked && vy < 0)) onSwipeCalendarStack(1);
        else onSwipeCalendarStack(-1);
      }
      x.set(0);
      return;
    }

    if (!wasPanning) {
      if (Math.abs(x.get()) > 0.5) flingToHops(0);
      else x.set(0);
      return;
    }

    const px = x.get();
    const vx = info.velocity.x;
    let hops = 0;

    const flicked = Math.abs(vx) > COMMIT_VELOCITY;
    const dragged = Math.abs(px) > pageWidth * COMMIT_RATIO;
    if (flicked || dragged) {
      if (Math.abs(px) > pageWidth * 0.06) {
        hops = px < 0 ? 1 : -1;
      } else {
        hops = vx < 0 ? 1 : -1;
      }
    }

    flingToHops(hops);
  };

  const handleDayTap = (day: Date) => {
    // iPhone uses a sheet; iPad updates the persistent day inspector.
    if (isMobile) setDaySheetDate(day);
    requestAnimationFrame(() => onSelectDate(day));
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
                  label={format(date, 'MMMM yyyy', { locale: dateLocale })}
                  gradient={i === WINDOW ? monthTheme.gradient : getMonthTheme(date).gradient}
                  textColor={i === WINDOW ? monthTheme.textOnStrong : getMonthTheme(date).textOnStrong}
                  onTitleClick={i === WINDOW ? openYearView : undefined}
                />
              ))}
            </motion.div>
          </div>

          {!isOnCurrentMonth && (
            <button
              type="button"
              onClick={goToToday}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 min-h-11 px-3 rounded-full bg-white/25 active:bg-white/40 text-white text-xs font-semibold tracking-wide backdrop-blur-sm"
            >
              I dag
            </button>
          )}
        </div>

        <div className="bg-transparent relative">
          <div className="grid grid-cols-7 px-4 py-3.5">
            {WEEKDAYS.map((d, i) => (
              <div key={d} className={`text-center text-[12px] font-semibold uppercase tracking-[0.12em] ${
                i >= 5 ? 'text-primary/50' : 'text-foreground/40'
              }`}>
                {d}
              </div>
            ))}
          </div>
        </div>

        {/* Continuous infinite-feel month strip — touch-action:none so Android gets H+V gestures */}
        <div
          ref={trackRef}
          className="relative flex-1 min-h-0 overflow-hidden select-none calendar-gesture-surface"
        >
          <motion.div
            className="absolute top-0 bottom-0 flex will-change-transform"
            style={{
              x,
              width: pageWidth ? pageWidth * (WINDOW * 2 + 1) : '500%',
              left: pageWidth ? -pageWidth * WINDOW : '-200%',
              touchAction: 'none',
              WebkitUserSelect: 'none',
              userSelect: 'none',
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
                  interactive={i === WINDOW}
                  onTap={handleDayTap}
                  onLongPress={onCreateEvent}
                  onPressLock={lockStripForPress}
                  onPressUnlock={unlockStripForPress}
                  getMemberForEvent={getMemberForEvent}
                  countdownEmojiByDate={countdownEmojiByDate}
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
              initial={{ y: 6 }}
              animate={{ y: 0 }}
              exit={{ opacity: 0 }}
              transition={fadeQuick}
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
            countdowns={countdownsByDate[format(daySheetDate, 'yyyy-MM-dd')] || []}
            members={members}
            householdId={householdId}
            currentMemberId={currentMemberId}
            highlight={highlight}
            onClose={() => setDaySheetDate(null)}
            onPickEvent={(ev) => {
              const display = ev as DisplayEvent;
              if (display.isOverlay) {
                setOverlayEvent(display);
                return;
              }
              // Keep day sheet under detail — backdrop pops one level
              setDetailEvent(ev);
            }}
            onPickCountdown={(cd) => setDetailCountdown(cd)}
            onCreateForDate={(d) => {
              // Keep day sheet under create flow
              onCreateEvent(d);
            }}
            onCreateCountdown={onCreateCountdown}
            onEditEvent={onEditEvent}
            onQuickEditEvent={onQuickEditEvent}
            calendarKind={calendarKind}
            canSeedWeek={canSeedWeek}
            onSeedWeek={() => {
              setDaySheetDate(null);
              onSeedWeek?.();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detailCountdown && (
          <CountdownDetailSheet
            countdown={
              activeCountdowns.find((c) => c.id === detailCountdown.id) ?? detailCountdown
            }
            members={members}
            currentMemberId={currentMemberId}
            onClose={() => setDetailCountdown(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {overlayEvent && (
          <OverlayEventSheet
            event={overlayEvent}
            viewerHouseholdId={householdId}
            onClose={() => setOverlayEvent(null)}
            onOpenSourceCalendar={(id) => {
              setOverlayEvent(null);
              setDaySheetDate(null);
              onSwitchCalendar?.(id);
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
            calendarKind={calendarKind}
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
  textColor,
  onTitleClick,
}: {
  width: number;
  label: string;
  gradient: string;
  textColor: string;
  onTitleClick?: () => void;
}) => (
  <div
    className="h-full shrink-0 flex items-center justify-center px-5"
    style={{
      width: width || '33.333%',
      background: gradient,
      color: textColor,
    }}
  >
    {onTitleClick ? (
      <button type="button" onClick={onTitleClick} className="text-center">
        <h2 className="text-xl font-extrabold capitalize text-current tracking-wide">{label}</h2>
      </button>
    ) : (
      <h2 className="text-xl font-extrabold capitalize text-current tracking-wide text-center">{label}</h2>
    )}
  </div>
);

/* ---------- Month panel ---------- */

interface MonthPanelProps {
  width: number;
  monthDate: Date;
  days: Date[];
  eventsByDate: Record<string, DisplayEvent[]>;
  /** Events from adjacent months so padding days stay filled */
  neighbourEventsByDate?: Record<string, DisplayEvent[]>;
  monthTheme: ReturnType<typeof getMonthTheme>;
  members: HouseholdMember[];
  highlight: Highlight;
  interactive: boolean;
  onTap: (day: Date) => void;
  onLongPress: (day: Date) => void;
  onPressLock: () => void;
  onPressUnlock: () => void;
  getMemberForEvent: (event: Event) => HouseholdMember | undefined;
  countdownEmojiByDate?: Record<string, string>;
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
  onPressLock,
  onPressUnlock,
  getMemberForEvent,
  countdownEmojiByDate,
}: MonthPanelProps) => {
  const spanByDate = useMemo(
    () => buildSpanSegmentsByDate(days, eventsByDate, neighbourEventsByDate),
    [days, eventsByDate, neighbourEventsByDate],
  );

  return (
    <div
      className={`grid grid-cols-7 auto-rows-[minmax(0,1fr)] gap-x-1 gap-y-1 px-4 pt-1.5 pb-4 content-stretch h-full min-h-0 shrink-0 ${
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
            onPressLock={onPressLock}
            onPressUnlock={onPressUnlock}
            getMemberForEvent={getMemberForEvent}
            countdownEmoji={countdownEmojiByDate?.[dateStr]}
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
  dayEvents: DisplayEvent[];
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
  onPressLock: () => void;
  onPressUnlock: () => void;
  getMemberForEvent: (event: Event) => HouseholdMember | undefined;
  countdownEmoji?: string;
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
function packEventRows(events: DisplayEvent[], maxMarks: number): { rows: DisplayEvent[][]; overflow: number } {
  const sorted = [...events].sort((a, b) => {
    const aRank = CATEGORY_ORDER[a.category ?? 'other'] ?? 999;
    const bRank = CATEGORY_ORDER[b.category ?? 'other'] ?? 999;
    if (aRank !== bRank) return aRank - bRank;
    return (a.start_time || '').localeCompare(b.start_time || '');
  });

  const rows: DisplayEvent[][] = [];
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
  monthTheme: _monthTheme,
  members: _members,
  highlight,
  onTap,
  onLongPress,
  onPressLock,
  onPressUnlock,
  getMemberForEvent,
  countdownEmoji,
}: DayCellProps) => {
  const { dateLocale } = useLocale();
  const dayAriaLabel = format(day, 'EEEE d. MMMM yyyy', { locale: dateLocale });
  const { longPressHandlers, didFire } = useLongPress({
    onRecognize: onPressLock,
    onLongPress: () => {
      onLongPress(day);
    },
    onDisarm: onPressUnlock,
  });

  const handleClick = () => {
    if (didFire()) return;
    onTap(day);
  };

  const { rows, overflow } = packEventRows(dayEvents, MAX_VISIBLE_MARKS);
  const laneCount = Math.max(maxSpanLane(spanSegments) + 1, 0);
  const spanByLane = new Map(spanSegments.map((s) => [s.lane, s]));

  const renderEventMark = (ev: DisplayEvent) => {
    if (ev.isOverlay) {
      const evHighlighted = highlight && highlight.eventId === ev.id;
      return (
        <div
          key={ev.id}
          title={ev.title}
          className={`${MARK_CHIP} rounded-full bg-muted ring-1 ring-border/60 ${
            evHighlighted ? 'ring-1 ring-primary/40' : ''
          }`}
        />
      );
    }
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
            evHighlighted ? 'ring-1 ring-primary/40' : ''
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
        className={`${MARK_CHIP} rounded-full ${fallback.bg} ${evHighlighted ? 'ring-1 ring-primary/40' : ''}`}
        title={ev.title}
      />
    );
  };

  return (
    <button
      {...longPressHandlers}
      onClick={handleClick}
      aria-label={dayAriaLabel}
      className={`relative flex flex-col items-center justify-start pt-1 pb-1 px-0 rounded-2xl min-h-0 h-full overflow-visible ${
        isHighlighted ? 'ring-2 ring-primary/40' : ''
      }`}
    >
      <span
        className={`w-6 h-6 shrink-0 flex items-center justify-center rounded-full text-[13px] font-semibold ${
          weekend && !today ? 'opacity-60' : ''
        }`}
        style={
          today
            ? { border: '2px solid hsl(var(--primary))', color: 'hsl(var(--primary))' }
            : undefined
        }
      >
        {format(day, 'd')}
      </span>

      {countdownEmoji && (
        <span className="text-[11px] leading-none mt-0.5" aria-hidden>
          {countdownEmoji}
        </span>
      )}

      {/* Pastel multi-day rails — stacked lanes; start icon centered under date */}
      {laneCount > 0 && (
        <div className="mt-1 w-full flex flex-col gap-0.5 px-0 shrink-0 z-[1]">
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

            // Bridge gap-x-1 (4px); absolute so start icon can stay centered under the date
            let railPos = 'left-0 right-0';
            if (seg.isStart && seg.isEnd) railPos = 'left-0.5 right-0.5';
            else if (seg.isStart) railPos = 'left-0 right-[-2px]';
            else if (seg.isEnd) railPos = 'left-[-2px] right-0';
            else railPos = 'left-[-2px] right-[-2px]';

            return (
              <div
                key={seg.event.id}
                title={seg.event.title}
                className={`relative ${SPAN_RAIL_H} w-full flex items-center justify-center`}
              >
                <div
                  aria-hidden
                  className={`absolute inset-y-0 ${railPos} ${visuals.railBg} ${
                    seg.isStart ? 'rounded-l-full' : ''
                  } ${seg.isEnd ? 'rounded-r-full' : ''} ${
                    evHighlighted ? 'ring-1 ring-primary/40' : ''
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
        <div className="mt-1 w-full flex flex-col items-center gap-0.5 min-h-0 flex-1 px-0.5">
          {rows.map((row, i) => (
            <div
              key={row.map((e) => e.id).join('-') || i}
              className={`flex items-center justify-center gap-0.5 ${row.length > 1 ? 'flex-row' : 'flex-col'}`}
            >
              {row.map((ev) => renderEventMark(ev))}
            </div>
          ))}
          {overflow > 0 && (
            <div className="text-[8px] text-muted-foreground text-center font-medium leading-none shrink-0 mt-0.5">
              +{overflow}
            </div>
          )}
        </div>
      )}
    </button>
  );
};

const YearView = ({ year, onSelectMonth, onBack, onChangeYear }: { year: number; onSelectMonth: (m: number) => void; onBack: () => void; onChangeYear: (y: number) => void }) => {
  const { dateLocale } = useLocale();
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

      <div className="grid grid-cols-3 gap-4 px-5 pt-4 flex-1 content-start overflow-y-auto scroll-touch overscroll-contain">
        {months.map((m) => {
          const theme = getMonthTheme(new Date(year, m, 1));
          const isCurrentMonth = now.getFullYear() === year && now.getMonth() === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => onSelectMonth(m)}
              className={`rounded-2xl py-4 text-center transition-all duration-200 ${
                isCurrentMonth ? 'ring-2 ring-offset-2' : ''
              }`}
              style={{
                backgroundColor: theme.light,
                ...(isCurrentMonth ? { ringColor: theme.dark, borderColor: theme.dark } : {}),
              }}
            >
              <span className="text-sm font-semibold capitalize" style={{ color: theme.dark }}>
                {format(new Date(year, m, 1), 'MMM', { locale: dateLocale })}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarView;
