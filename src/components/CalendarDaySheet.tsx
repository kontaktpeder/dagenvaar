import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { DAY_PART_LABELS, getMemberColor } from '@/lib/colors';
import { EVENT_CATEGORY_META } from '@/lib/eventCategories';
import { resolveCategoryVisuals, getMemberColorMap } from '@/lib/categoryPresentation';
import { formatMultiDayLabel } from '@/lib/multiDaySpans';
import { translateDayPart } from '@/lib/i18n';
import { useLocale } from '@/hooks/useLocale';
import type { Event } from '@/hooks/useEvents';
import type { DisplayEvent } from '@/hooks/useOverlayEvents';
import type { HouseholdMember } from '@/hooks/useHousehold';
import type { Highlight } from '@/pages/Index';
import ListView from '@/components/ListView';
import CenteredPopup from '@/components/CenteredPopup';
import PopupStickyFooter from '@/components/PopupStickyFooter';

interface CalendarDaySheetProps {
  date: Date;
  events: DisplayEvent[];
  members: HouseholdMember[];
  householdId: string;
  currentMemberId: string;
  highlight?: Highlight;
  onClose: () => void;
  onPickEvent: (event: DisplayEvent) => void;
  onCreateForDate: (date: Date) => void;
  onEditEvent?: (event: Event) => void;
  onQuickEditEvent?: (event: Event) => void;
  calendarKind?: string;
  canSeedWeek?: boolean;
  onSeedWeek?: () => void;
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
  calendarKind = 'home',
  canSeedWeek = false,
  onSeedWeek,
}: CalendarDaySheetProps) => {
  const { t, locale, dateLocale } = useLocale();
  const [showList, setShowList] = useState(false);
  const getMember = (id: string) => members.find((m) => m.id === id);

  const handleDismiss = () => {
    onClose();
  };

  const formatEventTime = (ev: Event) => {
    const dps = (ev as any).day_part_start as string | null;
    const parts: string[] = [];
    if (ev.start_time) {
      parts.push(ev.start_time.slice(0, 5));
      if (ev.end_time) parts[0] += `–${ev.end_time.slice(0, 5)}`;
    } else {
      const label = translateDayPart(locale, dps || ev.day_part) || DAY_PART_LABELS[dps || ev.day_part] || ev.day_part;
      if (label) parts.push(label);
    }
    return parts.join(' · ') || null;
  };

  return (
    <>
    <CenteredPopup
      onClose={handleDismiss}
      onExit={onClose}
      size="sheet"
      detents={['half', 'full']}
      initialDetent="half"
      zClassName="z-50"
    >
      <div className="px-5 pt-1 pb-3 shrink-0">
        <h2 className="text-lg font-bold capitalize">
          {format(date, 'EEEE d. MMMM', { locale: dateLocale })}
        </h2>
      </div>

      <div className="flex flex-col min-h-0 flex-1">
            <div className="flex-1 overflow-y-auto overscroll-contain scroll-touch px-5 pb-3 space-y-2 min-h-0" data-sheet-scroll>
              {events.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[8rem] text-center px-2">
                  <p className="font-medium text-foreground">{t('event.emptyDay')}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {canSeedWeek ? t('event.emptyWeekHint') : t('event.emptyDayHint')}
                  </p>
                </div>
              ) : (
                [...events]
                  .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
                  .map((ev) => {
                    const timeLabel = formatEventTime(ev);
                    const multiLabel = formatMultiDayLabel(ev);

                    if (ev.isOverlay) {
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => onPickEvent(ev)}
                          className="w-full text-left rounded-xl p-3 bg-muted/70 border border-border/50"
                        >
                          <span className="font-semibold text-sm truncate block">{ev.title}</span>
                          {timeLabel && (
                            <p className="text-xs text-muted-foreground mt-0.5">{timeLabel}</p>
                          )}
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {t('event.overlayHint')}
                          </p>
                        </button>
                      );
                    }

                    const member = getMember(ev.owner_member_id);
                    const color = member ? getMemberColor(member.color_token) : getMemberColor('pastel-blue');
                    const meta = EVENT_CATEGORY_META[(ev.category as keyof typeof EVENT_CATEGORY_META) || 'other'];
                    const visuals = resolveCategoryVisuals(ev.category, getMemberColorMap(member));
                    const Icon = meta?.Icon;

                    return (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => onPickEvent(ev)}
                        className={`w-full text-left rounded-xl p-3 ${visuals.softBg ?? color.bg}`}
                      >
                        <div className="flex items-center gap-2">
                          {Icon && (
                            <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${visuals.railBg}`}>
                              <Icon size={12} strokeWidth={2} className={visuals.iconColor} />
                            </span>
                          )}
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
              {canSeedWeek && events.length === 0 && onSeedWeek && (
                <button
                  type="button"
                  onClick={onSeedWeek}
                  className="w-full rounded-2xl bg-primary text-primary-foreground py-3.5 font-semibold"
                >
                  {t('event.fillWeek')}
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowList(true)}
                className={`w-full rounded-2xl py-3.5 font-semibold ${
                  canSeedWeek && events.length === 0
                    ? 'bg-muted text-foreground'
                    : 'bg-primary text-primary-foreground'
                }`}
              >
                {t('event.seeList')}
              </button>
              <button
                type="button"
                onClick={() => onCreateForDate(date)}
                className="w-full rounded-2xl bg-green-200 text-green-900 py-3.5 font-semibold"
              >
                {t('event.newActivity')}
              </button>
            </PopupStickyFooter>
        </div>
    </CenteredPopup>

    <AnimatePresence>
    {showList && (
      <CenteredPopup
        onClose={() => setShowList(false)}
        onExit={() => setShowList(false)}
        size="sheet"
        zClassName="z-[55]"
      >
        <div className="px-5 pt-1 pb-2 shrink-0">
          <h2 className="text-lg font-bold">
            {locale === 'en' ? 'List' : 'Liste'}
            <span className="text-muted-foreground font-medium text-base">
              {' · '}
              {format(date, 'd. MMM', { locale: dateLocale })}
            </span>
          </h2>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ListView
            householdId={householdId}
            members={members}
            currentMemberId={currentMemberId}
            calendarKind={calendarKind}
            initialDate={date}
            embedded
            highlight={highlight}
            onEditEvent={onEditEvent}
            onQuickEditEvent={onQuickEditEvent}
          />
        </div>
      </CenteredPopup>
    )}
    </AnimatePresence>
    </>
  );
};

export default CalendarDaySheet;
