import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { format, addDays, subDays, isToday } from 'date-fns';
import { getMonthTheme } from '@/lib/monthTheme';
import { nb } from 'date-fns/locale';
import { useEventsForDate, type Event } from '@/hooks/useEvents';
import { useListItemsForDate, useCreateListItem, useToggleListItem, useDeleteListItem } from '@/hooks/useListItems';
import { getMemberColor } from '@/lib/colors';
import { resolveCategoryVisuals, getMemberColorMap } from '@/lib/categoryPresentation';
import {
  AXIS_START, AXIS_END, AXIS_SPAN,
  DAY_PART_AXIS_RANGES, TIMELINE_SEGMENTS,
  parseTimeToAxisHour,
} from '@/lib/dayParts';
import type { HouseholdMember } from '@/hooks/useHousehold';
import type { Highlight } from '@/pages/Index';
import EventDetailSheet from '@/components/EventDetailSheet';
import ViewHeader from '@/components/ViewHeader';
import { useLongPress } from '@/hooks/useLongPress';

interface ListViewProps {
  householdId: string;
  members: HouseholdMember[];
  currentMemberId: string;
  initialDate?: Date;
  onDateChange?: (date: Date) => void;
  onEditEvent?: (event: Event) => void;
  highlight?: Highlight;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const getFallbackRange = (event: Event): [number, number] => {
  const dps = (event as any).day_part_start as string | null;
  const dpe = (event as any).day_part_end as string | null;
  const single = event.day_part as string | null;

  if (dps && dpe && DAY_PART_AXIS_RANGES[dps] && DAY_PART_AXIS_RANGES[dpe]) {
    return [DAY_PART_AXIS_RANGES[dps][0], DAY_PART_AXIS_RANGES[dpe][1]];
  }
  if (dps && DAY_PART_AXIS_RANGES[dps]) return DAY_PART_AXIS_RANGES[dps];
  if (single && DAY_PART_AXIS_RANGES[single]) return DAY_PART_AXIS_RANGES[single];
  return DAY_PART_AXIS_RANGES.afternoon;
};

type TimelineEvent = {
  event: Event;
  start: number;
  end: number;
  leftPct: number;
  widthPct: number;
};

const ListView = ({ householdId, members, currentMemberId, initialDate, onDateChange, onEditEvent, highlight }: ListViewProps) => {
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date());
  const [newItem, setNewItem] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const { data: events = [] } = useEventsForDate(householdId, dateStr);
  const { data: listItems = [] } = useListItemsForDate(householdId, dateStr);
  const createItem = useCreateListItem();
  const toggleItem = useToggleListItem();
  const deleteItem = useDeleteListItem();

  useEffect(() => {
    if (initialDate) setSelectedDate(initialDate);
  }, [initialDate]);

  useEffect(() => {
    onDateChange?.(selectedDate);
  }, [selectedDate, onDateChange]);

  const timelineEvents = useMemo<TimelineEvent[]>(() => {
    return events
      .map((event) => {
        const explicitStart = parseTimeToAxisHour(event.start_time);
        const explicitEnd = parseTimeToAxisHour(event.end_time);

        let start: number;
        let end: number;

        if (explicitStart != null && explicitEnd != null) {
          start = explicitStart;
          end = explicitEnd <= explicitStart ? explicitStart + 1 : explicitEnd;
        } else {
          const [fallbackStart, fallbackEnd] = getFallbackRange(event);
          start = fallbackStart;
          end = fallbackEnd;
        }

        start = clamp(start, AXIS_START, AXIS_END);
        end = clamp(end, AXIS_START, AXIS_END);
        if (end <= start) end = Math.min(AXIS_END, start + 0.5);

        const leftPct = ((start - AXIS_START) / AXIS_SPAN) * 100;
        const widthPct = ((end - start) / AXIS_SPAN) * 100;

        return { event, start, end, leftPct, widthPct };
      })
      .sort((a, b) => {
        if (a.start !== b.start) return a.start - b.start;
        return (b.end - b.start) - (a.end - a.start);
      });
  }, [events]);

  const handleSwipe = (_: any, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 50) {
      setSelectedDate((d) => (info.offset.x < 0 ? addDays(d, 1) : subDays(d, 1)));
    }
  };

  const handleAddItem = () => {
    if (!newItem.trim()) return;
    createItem.mutate({
      household_id: householdId,
      title: newItem.trim(),
      item_date: dateStr,
      owner_member_id: currentMemberId,
    });
    setNewItem('');
    inputRef.current?.focus();
  };

  const getMemberForEvent = (event: Event) => members.find((m) => m.id === event.owner_member_id);

  const segmentPositions = useMemo(() => {
    return TIMELINE_SEGMENTS.map((seg) => {
      const [s, e] = DAY_PART_AXIS_RANGES[seg.key];
      const leftPct = ((s - AXIS_START) / AXIS_SPAN) * 100;
      const widthPct = ((e - s) / AXIS_SPAN) * 100;
      return { ...seg, leftPct, widthPct };
    });
  }, []);

  return (
    <>
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleSwipe}
        className="flex flex-col h-full"
      >
        <ViewHeader
          variant="calendar"
          onPrev={() => setSelectedDate((d) => subDays(d, 1))}
          onNext={() => setSelectedDate((d) => addDays(d, 1))}
          calendarStyle={{ background: getMonthTheme(selectedDate).gradient }}
        >
          {isToday(selectedDate)
            ? `I dag · ${format(selectedDate, 'd. MMM', { locale: nb })}`
            : format(selectedDate, 'EEEE d. MMM', { locale: nb })}
        </ViewHeader>

        {/* Timeline panel */}
        <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-sm px-4 pt-3 pb-3">
          <div className="flex px-0 mb-2">
            {segmentPositions.map((seg) => (
              <div key={seg.key} className="text-center" style={{ width: `${seg.widthPct}%` }}>
                <span className="text-[9px] font-medium tracking-wider text-muted-foreground/60">{seg.label}</span>
              </div>
            ))}
          </div>

          <div className="relative space-y-2">
            {segmentPositions.slice(1).map((seg) => (
              <div key={seg.key} className="absolute top-0 bottom-0 w-px bg-border/15" style={{ left: `${seg.leftPct}%` }} />
            ))}

            {timelineEvents.length === 0 ? (
              <div className="py-3 flex items-center justify-center">
                <span className="text-xs text-muted-foreground/50">Ingen hendelser</span>
              </div>
            ) : (
              timelineEvents.map((t) => (
                <TimelineBar
                  key={t.event.id}
                  t={t}
                  members={members}
                  currentMemberId={currentMemberId}
                  highlight={highlight}
                  onTap={(ev) => setSelectedEvent(ev)}
                  onLongPress={(ev) => onEditEvent?.(ev)}
                  getMemberForEvent={getMemberForEvent}
                />
              ))
            )}
          </div>
        </div>

        {/* Separator */}
        <div className="px-5 mb-3 mt-3">
          <div className="h-px bg-border" />
        </div>

        {/* Add item input */}
        <div className="px-5 mb-4">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
              placeholder="Legg til punkt..."
              className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={handleAddItem}
              disabled={!newItem.trim()}
              className="rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-40 transition-all"
            >
              +
            </button>
          </div>
        </div>

        {/* List items */}
        <div className="flex-1 overflow-y-auto px-5 pb-32 space-y-2">
          {listItems.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-soft"
            >
              <button
                onClick={() => toggleItem.mutate({ id: item.id, is_checked: !item.is_checked })}
                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                  item.is_checked ? 'bg-primary border-primary' : 'border-border hover:border-primary'
                }`}
              >
                {item.is_checked && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7L6 10L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground" />
                  </svg>
                )}
              </button>
              <span className={`flex-1 text-base ${item.is_checked ? 'line-through text-muted-foreground' : ''}`}>
                {item.title}
              </span>
              <button
                onClick={() => deleteItem.mutate(item.id)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </motion.div>
          ))}

          {events.length === 0 && listItems.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-4xl mb-3">📝</p>
              <p className="font-medium">Ingen planer ennå</p>
              <p className="text-sm">Legg til noe over 👆</p>
            </div>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedEvent && (
          <EventDetailSheet
            event={selectedEvent}
            members={members}
            currentMemberId={currentMemberId}
            onClose={() => setSelectedEvent(null)}
            onEdit={onEditEvent ? (ev) => { setSelectedEvent(null); onEditEvent(ev); } : undefined}
          />
        )}
      </AnimatePresence>
    </>
  );
};

/* ---------- TimelineBar with long-press ---------- */

interface TimelineBarProps {
  t: TimelineEvent;
  members: HouseholdMember[];
  currentMemberId: string;
  highlight: Highlight;
  onTap: (event: Event) => void;
  onLongPress: (event: Event) => void;
  getMemberForEvent: (event: Event) => HouseholdMember | undefined;
}

const TimelineBar = ({ t, members, currentMemberId, highlight, onTap, onLongPress, getMemberForEvent }: TimelineBarProps) => {
  const { longPressHandlers, didFire } = useLongPress({
    onLongPress: () => {
      if (t.event.owner_member_id === currentMemberId) {
        onLongPress(t.event);
      }
    },
  });

  const handleClick = () => {
    if (didFire()) return;
    onTap(t.event);
  };

  const member = getMemberForEvent(t.event);
  const visuals = resolveCategoryVisuals(t.event.category, getMemberColorMap(member));
  const fallback = member ? getMemberColor(member.color_token).bg : 'bg-muted/40';
  const barBg = visuals.softBg ?? fallback;
  const isHighlighted = highlight && highlight.eventId === t.event.id;

  return (
    <div className="relative h-7">
      <button
        type="button"
        {...longPressHandlers}
        onClick={handleClick}
        aria-label={t.event.title}
        className={`absolute top-0 h-7 min-w-[48px] rounded-xl px-2.5 ${barBg} text-foreground flex items-center cursor-pointer active:scale-[0.98] transition-transform focus-visible:ring-2 focus-visible:ring-primary ${isHighlighted ? 'ring-2 ring-primary/50 animate-pulse' : ''}`}
        style={{ left: `${t.leftPct}%`, width: `${Math.max(t.widthPct, 4)}%` }}
      >
        <span className="truncate text-[11px] font-semibold">{t.event.title}</span>
      </button>
    </div>
  );
};

export default ListView;
