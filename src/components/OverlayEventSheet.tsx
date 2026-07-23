import { useLocale } from '@/hooks/useLocale';
import { DAY_PART_LABELS } from '@/lib/colors';
import { translateDayPart } from '@/lib/i18n';
import type { DisplayEvent } from '@/hooks/useOverlayEvents';
import { useHideOverlayEvent } from '@/hooks/useHideOverlayEvent';
import CenteredPopup from '@/components/CenteredPopup';
import PopupStickyFooter from '@/components/PopupStickyFooter';

interface OverlayEventSheetProps {
  event: DisplayEvent;
  viewerHouseholdId: string;
  onClose: () => void;
  onOpenSourceCalendar: (householdId: string) => void;
}

const OverlayEventSheet = ({
  event,
  viewerHouseholdId,
  onClose,
  onOpenSourceCalendar,
}: OverlayEventSheetProps) => {
  const { t, locale } = useLocale();
  const hideOverlay = useHideOverlayEvent(viewerHouseholdId);

  const timeLabel = (() => {
    if (event.start_time) {
      const start = event.start_time.slice(0, 5);
      return event.end_time ? `${start}–${event.end_time.slice(0, 5)}` : start;
    }
    const dps = event.day_part_start || event.day_part;
    return translateDayPart(locale, dps) || DAY_PART_LABELS[dps] || dps || null;
  })();

  const handleHide = async () => {
    try {
      await hideOverlay.mutateAsync(event.id);
      onClose();
    } catch (err) {
      console.error('[OverlayEventSheet] hide failed', err);
    }
  };

  return (
    <CenteredPopup onClose={onClose} onExit={onClose} size="hug" zClassName="z-[60]" backdrop="none">
      <div className="px-5 pt-2 pb-2" data-sheet-scroll>
        <div className="rounded-2xl bg-muted/70 border border-border/50 p-5 mb-2">
          <h2 className="text-xl font-bold mb-1">{event.title}</h2>
          {timeLabel && (
            <p className="text-sm text-muted-foreground">{timeLabel}</p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            {t('event.overlayHint')}
          </p>
        </div>
      </div>

      <PopupStickyFooter className="space-y-2">
        <button
          type="button"
          onClick={handleHide}
          disabled={hideOverlay.isPending}
          className="w-full rounded-2xl border border-border py-3.5 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
        >
          {hideOverlay.isPending ? t('common.loading') : t('event.hideOverlayHere')}
        </button>
        {event.sourceHouseholdId && (
          <button
            type="button"
            onClick={() => {
              onOpenSourceCalendar(event.sourceHouseholdId!);
              onClose();
            }}
            className="w-full rounded-2xl bg-primary text-primary-foreground py-3.5 text-sm font-semibold"
          >
            {t('event.openSourceCalendar')}
          </button>
        )}
      </PopupStickyFooter>
    </CenteredPopup>
  );
};

export default OverlayEventSheet;
