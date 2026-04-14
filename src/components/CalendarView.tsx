import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, isWeekend, isSameMonth, addMonths, subMonths } from 'date-fns';
import { nb } from 'date-fns/locale';
import { useEventsForMonth, type Event } from '@/hooks/useEvents';
import { getMemberColor } from '@/lib/colors';
import type { HouseholdMember } from '@/hooks/useHousehold';

interface CalendarViewProps {
  householdId: string;
  members: HouseholdMember[];
  onSelectDate: (date: Date) => void;
  onCreateEvent: (date: Date) => void;
}

const WEEKDAYS = ['man', 'tir', 'ons', 'tor', 'fre', 'lør', 'søn'];

const CalendarView = ({ householdId, members, onSelectDate, onCreateEvent }: CalendarViewProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [direction, setDirection] = useState(0);
  const [showYear, setShowYear] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const { data: events = [] } = useEventsForMonth(householdId, year, month);

  const eventsByDate = useMemo(() => {
    const map: Record<string, Event[]> = {};
    events.forEach((e) => {
      if (!map[e.event_date]) map[e.event_date] = [];
      map[e.event_date].push(e);
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
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Month header */}
      <div className="flex items-center justify-between px-5 py-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-muted transition-colors">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 15L7 10L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <button onClick={() => setShowYear(true)} className="text-center">
          <h2 className="text-xl font-bold capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: nb })}
          </h2>
        </button>
        <button onClick={() => navigate(1)} className="p-2 rounded-full hover:bg-muted transition-colors">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M8 5L13 10L8 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 px-3 mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1 uppercase">
            {d}
          </div>
        ))}
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
          className="grid grid-cols-7 gap-y-1 px-3 flex-1"
        >
          {days.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDate[dateStr] || [];
            const inMonth = isSameMonth(day, currentDate);
            const today = isToday(day);
            const weekend = isWeekend(day);

            return (
              <button
                key={dateStr}
                onClick={() => handleDayTap(day)}
                className={`relative flex flex-col items-center py-2 rounded-2xl transition-all min-h-[3.5rem] ${
                  !inMonth ? 'opacity-30' : ''
                } ${weekend && inMonth ? 'bg-weekend' : ''} ${
                  today ? '' : 'hover:bg-muted'
                }`}
              >
                <span
                  className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-semibold ${
                    today ? 'ring-2 ring-today bg-today/30' : ''
                  }`}
                >
                  {format(day, 'd')}
                </span>
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayEvents.slice(0, 3).map((ev) => {
                      const member = getMemberForEvent(ev);
                      const color = member ? getMemberColor(member.color_token) : getMemberColor('pastel-blue');
                      return (
                        <div key={ev.id} className={`w-1.5 h-1.5 rounded-full ${color.dot}`} />
                      );
                    })}
                  </div>
                )}
              </button>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const YearView = ({ year, onSelectMonth, onBack }: { year: number; onSelectMonth: (m: number) => void; onBack: () => void }) => {
  const months = Array.from({ length: 12 }, (_, i) => i);
  const now = new Date();

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full"
    >
      <div className="flex items-center justify-between px-5 py-4">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-muted transition-colors">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 15L7 10L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h2 className="text-xl font-bold">{year}</h2>
        <div className="w-9" />
      </div>

      <div className="grid grid-cols-3 gap-4 px-5 flex-1 content-start">
        {months.map((m) => {
          const isCurrentMonth = now.getFullYear() === year && now.getMonth() === m;
          return (
            <button
              key={m}
              onClick={() => onSelectMonth(m)}
              className={`rounded-2xl py-4 text-center transition-all hover:bg-muted ${
                isCurrentMonth ? 'bg-today/30 ring-1 ring-today' : ''
              }`}
            >
              <span className="text-sm font-semibold capitalize">
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
