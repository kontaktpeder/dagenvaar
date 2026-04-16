import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { DAY_PART_LABELS, getMemberColor } from '@/lib/colors';
import { getEventCategoryMeta } from '@/lib/eventCategories';
import type { Event } from '@/hooks/useEvents';
import type { HouseholdMember } from '@/hooks/useHousehold';

interface CalendarDaySheetProps {
  date: Date;
  events: Event[];
  members: HouseholdMember[];
  onClose: () => void;
  onPickEvent: (event: Event) => void;
  onCreateForDate: (date: Date) => void;
}

const CalendarDaySheet = ({ date, events, members, onClose, onPickEvent, onCreateForDate }: CalendarDaySheetProps) => {
  const getMember = (id: string) => members.find((m) => m.id === id);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col"
    >
      <div className="absolute inset-0 bg-foreground/20" onClick={onClose} />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative mt-auto bg-background rounded-t-3xl max-h-[70vh] flex flex-col"
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        <div className="px-5 pb-2">
          <h2 className="text-lg font-bold capitalize">
            {format(date, 'EEEE d. MMMM', { locale: nb })}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-2">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Ingen hendelser denne dagen</p>
          ) : (
            events.map((ev) => {
              const member = getMember(ev.owner_member_id);
              const color = member ? getMemberColor(member.color_token) : getMemberColor('pastel-blue');
              const catMeta = getEventCategoryMeta(ev.category);
              const dps = (ev as any).day_part_start as string | null;

              return (
                <button
                  key={ev.id}
                  onClick={() => onPickEvent(ev)}
                  className={`w-full text-left rounded-xl p-3 ${catMeta?.chipBg ?? color.bg} transition-all active:scale-[0.98]`}
                >
                  <div className="flex items-center gap-2">
                    {catMeta && <catMeta.Icon size={14} className={catMeta.iconColor} />}
                    <span className="font-semibold text-sm truncate">{ev.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {DAY_PART_LABELS[dps || ev.day_part] || ev.day_part}
                    {ev.start_time && ` · ${ev.start_time.slice(0, 5)}`}
                    {ev.end_time && `–${ev.end_time.slice(0, 5)}`}
                    {member && ` · ${member.display_name}`}
                  </p>
                </button>
              );
            })
          )}
        </div>

        <div className="px-5 pb-8 pt-2">
          <button
            onClick={() => onCreateForDate(date)}
            className="w-full rounded-2xl bg-green-200 text-green-900 py-3 font-semibold transition-all hover:bg-green-300 active:scale-95"
          >
            + Ny hendelse
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CalendarDaySheet;
