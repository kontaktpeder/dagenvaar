import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { DAY_PART_LABELS, getMemberColor } from '@/lib/colors';
import { EVENT_CATEGORY_META } from '@/lib/eventCategories';
import { resolveCategoryVisuals, getMemberColorMap } from '@/lib/categoryPresentation';
import { formatMultiDayLabel } from '@/lib/multiDaySpans';
import type { Event } from '@/hooks/useEvents';
import type { HouseholdMember } from '@/hooks/useHousehold';
import type { Highlight } from '@/pages/Index';
import ListView from '@/components/ListView';
import CenteredPopup from '@/components/CenteredPopup';
import PopupStickyFooter from '@/components/PopupStickyFooter';

interface CalendarDaySheetProps {
  date: Date;
  events: Event[];
  members: HouseholdMember[];
  householdId: string;
  currentMemberId: string;
  highlight?: Highlight;
  onClose: () => void;
  onPickEvent: (event: Event) => void;
  onCreateForDate: (date: Date) => void;
  onEditEvent?: (event: Event) => void;
  onQuickEditEvent?: (event: Event) => void;
}

const CalendarDaySheet = ({
  date,
  events,
  members,
  householdId,
  currentMemberId,
  highlight,
  onClose,
  onPickEvent,
  onCreateForDate,
  onEditEvent,
  onQuickEditEvent,
}: CalendarDaySheetProps) => {
  const [showList, setShowList] = useState(false);
  const getMember = (id: string) => members.find((m) => m.id === id);

  const handleDismiss = () => {
    if (showList) setShowList(false);
    else onClose();
  };

  const formatEventTime = (ev: Event) => {
    const dps = (ev as any).day_part_start as string | null;
    const parts: string[] = [];
    if (ev.start_time) {
      parts.push(ev.start_time.slice(0, 5));
      if (ev.end_time) parts[0] += `–${ev.end_time.slice(0, 5)}`;
    } else {
      const label = DAY_PART_LABELS[dps || ev.day_part] || ev.day_part;
      if (label) parts.push(label);
    }
    return parts.join(' · ') || null;
  };

  return (
    <CenteredPopup onClose={handleDismiss} size="sheet" zClassName="z-50">
      <div className="px-5 pt-5 pb-3 shrink-0">
        <h2 className="text-lg font-bold capitalize">
          {format(date, 'EEEE d. MMMM', { locale: nb })}
        </h2>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {showList ? (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 min-h-0 overflow-hidden"
          >
            <ListView
              householdId={householdId}
              members={members}
              currentMemberId={currentMemberId}
              initialDate={date}
              embedded
              highlight={highlight}
              onEditEvent={onEditEvent}
              onQuickEditEvent={onQuickEditEvent}
            />
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col min-h-0 flex-1"
          >
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-3 space-y-2 min-h-0">
              {events.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[8rem] text-center">
                  <p className="font-medium text-foreground">Dagen er tom</p>
                  <p className="text-sm text-muted-foreground mt-1">Ingen aktiviteter planlagt</p>
                </div>
              ) : (
                [...events]
                  .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
                  .map((ev) => {
                    const member = getMember(ev.owner_member_id);
                    const color = member ? getMemberColor(member.color_token) : getMemberColor('pastel-blue');
                    const meta = EVENT_CATEGORY_META[(ev.category as keyof typeof EVENT_CATEGORY_META) || 'other'];
                    const visuals = resolveCategoryVisuals(ev.category, getMemberColorMap(member));
                    const Icon = meta?.Icon;
                    const timeLabel = formatEventTime(ev);
                    const multiLabel = formatMultiDayLabel(ev);

                    return (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => onPickEvent(ev)}
                        className={`w-full text-left rounded-xl p-3 ${visuals.softBg ?? color.bg} transition-all active:scale-95`}
                      >
                        <div className="flex items-center gap-2">
                          {Icon && <Icon size={14} className={visuals.iconColor} />}
                          <span className="font-semibold text-sm truncate">{ev.title}</span>
                        </div>
                        {multiLabel && (
                          <p className="text-xs font-medium text-foreground/70 mt-0.5">{multiLabel}</p>
                        )}
                        {timeLabel && (
                          <p className="text-xs text-muted-foreground mt-0.5">{timeLabel}</p>
                        )}
                      </button>
                    );
                  })
              )}
            </div>

            <PopupStickyFooter className="space-y-2">
              <button
                type="button"
                onClick={() => setShowList(true)}
                className="w-full rounded-2xl bg-primary text-primary-foreground py-3.5 font-semibold transition-all active:scale-95"
              >
                Se liste
              </button>
              <button
                type="button"
                onClick={() => onCreateForDate(date)}
                className="w-full rounded-2xl bg-green-200 text-green-900 py-3.5 font-semibold transition-all hover:bg-green-300 active:scale-95"
              >
                Ny aktivitet
              </button>
            </PopupStickyFooter>
          </motion.div>
        )}
      </AnimatePresence>
    </CenteredPopup>
  );
};

export default CalendarDaySheet;
