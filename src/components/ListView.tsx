import { useState, useRef, useEffect } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { format, addDays, subDays, isToday } from 'date-fns';
import { nb } from 'date-fns/locale';
import { useEventsForDate, type Event } from '@/hooks/useEvents';
import { useListItemsForDate, useCreateListItem, useToggleListItem, useDeleteListItem } from '@/hooks/useListItems';
import { DAY_PART_LABELS, getMemberColor } from '@/lib/colors';
import type { HouseholdMember } from '@/hooks/useHousehold';
import EventDetailSheet from '@/components/EventDetailSheet';

interface ListViewProps {
  householdId: string;
  members: HouseholdMember[];
  currentMemberId: string;
  initialDate?: Date;
}

const ListView = ({ householdId, members, currentMemberId, initialDate }: ListViewProps) => {
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

  const handleSwipe = (_: any, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 50) {
      setSelectedDate((d) => info.offset.x < 0 ? addDays(d, 1) : subDays(d, 1));
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

  const getMemberForEvent = (event: Event) => {
    return members.find((m) => m.id === event.owner_member_id);
  };

  return (
    <>
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleSwipe}
        className="flex flex-col h-full"
      >
        {/* Date header — lavendel accent */}
        <div className="bg-list-accent">
          <div className="px-5 py-4">
            <div className="flex items-center justify-between">
              <button onClick={() => setSelectedDate((d) => subDays(d, 1))} className="p-2 rounded-full hover:bg-white/40 transition-colors">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 15L7 10L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <div className="text-center">
                <h2 className="text-xl font-bold capitalize">
                  {isToday(selectedDate) ? 'I dag' : format(selectedDate, 'EEEE', { locale: nb })}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {format(selectedDate, 'd. MMMM yyyy', { locale: nb })}
                </p>
              </div>
              <button onClick={() => setSelectedDate((d) => addDays(d, 1))} className="p-2 rounded-full hover:bg-white/40 transition-colors">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M8 5L13 10L8 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Day events */}
        {events.length > 0 && (
          <div className="px-5 mt-4 mb-4 space-y-2">
            {events.map((event) => {
              const member = getMemberForEvent(event);
              const color = member ? getMemberColor(member.color_token) : getMemberColor('pastel-blue');
              return (
                <motion.button
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full text-left rounded-2xl p-4 ${color.bg} transition-all`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{event.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {member?.display_name} · {DAY_PART_LABELS[event.day_part] || event.day_part}
                        {event.start_time && ` · ${event.start_time.slice(0, 5)}`}
                        {event.end_time && `–${event.end_time.slice(0, 5)}`}
                      </p>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-muted-foreground"><path d="M8 5L13 10L8 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Separator */}
        <div className="px-5 mb-3">
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