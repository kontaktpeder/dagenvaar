import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { format, addDays, subDays, isToday } from 'date-fns';
import { getMonthTheme } from '@/lib/monthTheme';
import { nb } from 'date-fns/locale';
import { useEventsForDate, type Event } from '@/hooks/useEvents';
import { useListItemsForDate, useCreateListItem, useToggleListItem, useDeleteListItem } from '@/hooks/useListItems';
import { DAY_PART_LABELS, getMemberColor } from '@/lib/colors';
import { getEventCategoryMeta } from '@/lib/eventCategories';
import type { HouseholdMember } from '@/hooks/useHousehold';
import EventDetailSheet from '@/components/EventDetailSheet';
import ViewHeader from '@/components/ViewHeader';

interface ListViewProps {
  householdId: string;
  members: HouseholdMember[];
  currentMemberId: string;
  initialDate?: Date;
  onDateChange?: (date: Date) => void;
}

const AXIS_START = 6;
const AXIS_END = 26;
const AXIS_SPAN = AXIS_END - AXIS_START;

const DAY_PART_RANGES: Record<string, [number, number]> = {
  morning: [6, 10],
  late_morning: [10, 14],
  afternoon: [14, 18],
  evening: [18, 22],
  night: [22, 26],
  all_day: [6, 26],
};

const formatHourLabel = (h: number) => {
  const normalized = h >= 24 ? h - 24 : h;
  return `${String(Math.floor(normalized)).padStart(2, '0')}:00`;
};

const parseTimeToHour = (value: string | null) => {
  if (!value) return null;
  const [hh, mm] = value.split(':').map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  let hour = hh + mm / 60;
  if (hour < AXIS_START) hour += 24;
  return hour;
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const getFallbackRange = (event: Event): [number, number] => {
  const dps = (event as any).day_part_start as string | null;
  const dpe = (event as any).day_part_end as string | null;
  const single = event.day_part as string | null;

  if (dps && dpe && DAY_PART_RANGES[dps] && DAY_PART_RANGES[dpe]) {
    return [DAY_PART_RANGES[dps][0], DAY_PART_RANGES[dpe][1]];
  }
  if (dps && DAY_PART_RANGES[dps]) return DAY_PART_RANGES[dps];
  if (single && DAY_PART_RANGES[single]) return DAY_PART_RANGES[single];
  return DAY_PART_RANGES.afternoon;
};

type TimelineEvent = {
  event: Event;
  start: number;
  end: number;
  leftPct: number;
  widthPct: number;
  startLabel: string;
  endLabel: string;
};

const ListView = ({ householdId, members, currentMemberId, initialDate, onDateChange }: ListViewProps) => {
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
        const explicitStart = parseTimeToHour(event.start_time);
        const explicitEnd = parseTimeToHour(event.end_time);

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

        return {
          event,
          start,
          end,
          leftPct,
          widthPct,
          startLabel: event.start_time?.slice(0, 5) ?? formatHourLabel(start),
          endLabel: event.end_time?.slice(0, 5) ?? formatHourLabel(end),
        };
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

        {/* Sticky timeline panel */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border px-5 pt-2 pb-2">
          <div className="grid grid-cols-5 gap-1">
            {['Morgen', 'Formiddag', 'Etterm.', 'Kveld', 'Natt'].map((label) => (
              <span key={label} className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground text-center">
                {label}
              </span>
            ))}
          </div>

          <div className="mt-2 space-y-1.5 max-h-28 overflow-y-auto pr-1">
            {timelineEvents.length === 0 ? (
              <div className="h-8 rounded-md bg-muted/25 flex items-center justify-center">
                <span className="text-[11px] text-muted-foreground">Ingen hendelser i dag</span>
              </div>
            ) : (
              timelineEvents.map((t) => {
                const member = getMemberForEvent(t.event);
                const catMeta = getEventCategoryMeta(t.event.category);
                const fallback = member ? getMemberColor(member.color_token).bg : 'bg-muted';
                const barBg = catMeta?.chipBg ?? fallback;

                return (
                  <div key={t.event.id} className="relative h-6 rounded-md bg-muted/35">
                    {[20, 40, 60, 80].map((pct) => (
                      <div key={pct} className="absolute top-0 bottom-0 w-px bg-border/50" style={{ left: `${pct}%` }} />
                    ))}

                    <button
                      type="button"
                      onClick={() => setSelectedEvent(t.event)}
                      aria-label={`${t.event.title}, ${t.startLabel} til ${t.endLabel}`}
                      className={`absolute top-0 h-6 min-w-[52px] rounded-md px-1.5 shadow-sm ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-primary ${barBg} text-foreground flex items-center justify-between gap-1 cursor-pointer`}
                      style={{ left: `${t.leftPct}%`, width: `${Math.max(t.widthPct, 2)}%` }}
                    >
                      <span className="text-[10px] tabular-nums opacity-80 shrink-0">{t.startLabel}</span>
                      <span className="truncate text-[10px] font-medium">{t.event.title}</span>
                      <span className="text-[10px] tabular-nums opacity-80 shrink-0">{t.endLabel}</span>
                    </button>
                  </div>
                );
              })
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

      {selectedEvent && (
        <EventDetailSheet
          event={selectedEvent}
          members={members}
          currentMemberId={currentMemberId}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </>
  );
};

export default ListView;
