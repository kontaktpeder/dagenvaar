import { DAY_PART_LABELS, getMemberColor } from '@/lib/colors';
import { EVENT_CATEGORY_META } from '@/lib/eventCategories';
import { resolveCategoryVisuals, getMemberColorMap } from '@/lib/categoryPresentation';
import { formatMultiDayLabel } from '@/lib/multiDaySpans';
import { translateDayPart } from '@/lib/i18n';
import { useLocale } from '@/hooks/useLocale';
import type { Event } from '@/hooks/useEvents';
import type { DisplayEvent } from '@/hooks/useOverlayEvents';
import type { HouseholdMember } from '@/hooks/useHousehold';
import type { CountdownWithParticipants } from '@/hooks/useCountdowns';
import { calendarDaysUntil } from '@/lib/countdownTime';
import { getCountdownTheme } from '@/lib/countdownThemes';
import PopupStickyFooter from '@/components/PopupStickyFooter';

export interface DayOverviewProps {
  date: Date;
  events: DisplayEvent[];
  countdowns?: CountdownWithParticipants[];
  members: HouseholdMember[];
  calendarKind?: string;
  canSeedWeek?: boolean;
  /** sheet = PopupStickyFooter; panel = bordered stack in desktop aside */
  layout?: 'sheet' | 'panel';
  onPickEvent: (event: DisplayEvent) => void;
  onPickCountdown?: (countdown: CountdownWithParticipants) => void;
  onCreateForDate: (date: Date) => void;
  onCreateCountdown?: (date: Date) => void;
  onSeeList: () => void;
  onSeedWeek?: () => void;
}

const DayOverview = ({
  date,
  events,
  countdowns = [],
  members,
  calendarKind = 'home',
  canSeedWeek = false,
  layout = 'panel',
  onPickEvent,
  onPickCountdown,
  onCreateForDate,
  onCreateCountdown,
  onSeeList,
  onSeedWeek,
}: DayOverviewProps) => {
  const { t, locale, dateLocale } = useLocale();
  const getMember = (id: string) => members.find((m) => m.id === id);
  const showCountdownCta = calendarKind === 'home' && !!onCreateCountdown;

  const actions = (
    <>
      {canSeedWeek && events.length === 0 && onSeedWeek && (
        <button
          type="button"
          onClick={onSeedWeek}
          className="w-full rounded-2xl bg-primary py-3.5 font-semibold text-primary-foreground"
        >
          {t('event.fillWeek')}
        </button>
      )}
      <button
        type="button"
        onClick={onSeeList}
        className={`w-full rounded-2xl py-3.5 font-semibold ${
          canSeedWeek && events.length === 0
            ? 'bg-muted text-foreground'
            : 'bg-primary text-primary-foreground'
        }`}
      >
        {t('event.seeList')}
      </button>
      {showCountdownCta && (
        <button
          type="button"
          onClick={() => onCreateCountdown?.(date)}
          className="w-full rounded-2xl bg-pink-100 py-3.5 font-semibold text-pink-900"
        >
          {t('countdown.new')}
        </button>
      )}
      <button
        type="button"
        onClick={() => onCreateForDate(date)}
        className="w-full rounded-2xl bg-green-200 py-3.5 font-semibold text-green-900"
      >
        {t('event.newActivity')}
      </button>
    </>
  );

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
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain scroll-touch px-5 pb-3"
        data-sheet-scroll
      >
        {countdowns.map((cd) => {
          const theme = getCountdownTheme(cd.theme);
          const daysFromNow = calendarDaysUntil(cd.target_at);
          const label =
            daysFromNow <= 0
              ? t('countdown.itsTime')
              : daysFromNow === 1
                ? `1 ${t('countdown.dayLeft')}`
                : `${daysFromNow} ${t('countdown.daysLeft')}`;
          return (
            <button
              key={cd.id}
              type="button"
              onClick={() => onPickCountdown?.(cd)}
              className="w-full rounded-xl p-3 text-left"
              style={{ background: theme.gradient }}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{cd.emoji || '✨'}</span>
                <span className="truncate text-sm font-semibold">{cd.title}</span>
              </div>
              <p className={`mt-0.5 text-xs font-medium ${theme.accentText}`}>
                {t('countdown.onDay')} · {label}
              </p>
            </button>
          );
        })}

        {events.length === 0 && countdowns.length === 0 ? (
          <div className="flex h-full min-h-[8rem] flex-col items-center justify-center px-2 text-center">
            <p className="font-medium text-foreground">{t('event.emptyDay')}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {canSeedWeek ? t('event.emptyWeekHint') : t('event.emptyDayHint')}
            </p>
          </div>
        ) : (
          [...events]
            .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
            .map((ev) => {
              const timeLabel = formatEventTime(ev);
              const multiLabel = formatMultiDayLabel(ev, {
                dateLocale,
                daysLabel: (() => {
                  const end = (ev as any).end_date as string | undefined;
                  if (!end) return '';
                  const start = new Date(ev.event_date + 'T12:00:00');
                  const endD = new Date(end + 'T12:00:00');
                  const days = Math.round((endD.getTime() - start.getTime()) / 86400000) + 1;
                  return t('event.daysCount', { count: days });
                })(),
              });

              if (ev.isOverlay) {
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => onPickEvent(ev)}
                    className="w-full rounded-xl border border-border/50 bg-muted/70 p-3 text-left"
                  >
                    <span className="block truncate text-sm font-semibold">{ev.title}</span>
                    {timeLabel && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{timeLabel}</p>
                    )}
                    <p className="mt-1 text-[11px] text-muted-foreground">
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
                  className={`w-full rounded-xl p-3 text-left ${visuals.softBg ?? color.bg}`}
                >
                  <div className="flex items-center gap-2">
                    {Icon && (
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${visuals.railBg}`}>
                        <Icon size={12} strokeWidth={2} className={visuals.iconColor} />
                      </span>
                    )}
                    <span className="truncate text-sm font-semibold">{ev.title}</span>
                  </div>
                  {multiLabel && (
                    <p className="mt-0.5 text-xs font-medium text-foreground/70">{multiLabel}</p>
                  )}
                  {timeLabel && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{timeLabel}</p>
                  )}
                </button>
              );
            })
        )}
      </div>

      {layout === 'sheet' ? (
        <PopupStickyFooter className="space-y-2">{actions}</PopupStickyFooter>
      ) : (
        <div className="shrink-0 space-y-2 border-t border-border/60 bg-card/90 px-5 py-3">
          {actions}
        </div>
      )}
    </div>
  );
};

export default DayOverview;
