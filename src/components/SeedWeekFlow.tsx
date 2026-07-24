import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Dumbbell,
  UtensilsCrossed,
  Wine,
  BriefcaseBusiness,
  Heart,
  Users,
  Plane,
  Headphones,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateEvent } from '@/hooks/useEvents';
import { useLocale } from '@/hooks/useLocale';
import {
  SEED_TEMPLATES,
  buildSeedEvents,
  countSeedEvents,
  type SeedTemplateId,
} from '@/lib/seedWeek';
import { dismissSeedWeek } from '@/lib/seedWeekStorage';
import CenteredPopup from '@/components/CenteredPopup';
import PopupStickyFooter from '@/components/PopupStickyFooter';

const ICONS: Record<SeedTemplateId, LucideIcon> = {
  training: Dumbbell,
  dinner_home: UtensilsCrossed,
  dinner_out: Wine,
  work_late: BriefcaseBusiness,
  date_night: Heart,
  friends: Users,
  weekend: Plane,
  alone_time: Headphones,
  chores: Sparkles,
};

interface SeedWeekFlowProps {
  householdId: string;
  onClose: () => void;
  onComplete: () => void;
}

const SeedWeekFlow = ({ householdId, onClose, onComplete }: SeedWeekFlowProps) => {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const createEvent = useCreateEvent();
  const [selected, setSelected] = useState<Set<SeedTemplateId>>(() => new Set());
  const [saving, setSaving] = useState(false);

  const eventCount = useMemo(() => countSeedEvents([...selected]), [selected]);

  const toggle = (id: SeedTemplateId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const finish = () => {
    dismissSeedWeek(householdId);
    onComplete();
  };

  const handleSkip = () => {
    dismissSeedWeek(householdId);
    onClose();
  };

  const handleSubmit = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      const payloads = buildSeedEvents(householdId, [...selected], (key) => t(key));
      for (const payload of payloads) {
        await createEvent.mutateAsync(payload);
      }
      await queryClient.invalidateQueries({ queryKey: ['household-has-events', householdId] });
      toast.success(t('seed.done', { count: payloads.length }));
      finish();
    } catch (err: any) {
      toast.error(err?.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <CenteredPopup
      onClose={handleSkip}
      onExit={handleSkip}
      size="sheet"
      detents={['half', 'full']}
      initialDetent="half"
      zClassName="z-[70]"
    >
      <div className="px-5 pt-1 pb-3 shrink-0">
        <h2 className="text-2xl font-bold">{t('seed.title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('seed.subtitle')}</p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-touch px-5 pb-3 space-y-2" data-sheet-scroll>
        {SEED_TEMPLATES.map((template) => {
          const active = selected.has(template.id);
          const Icon = ICONS[template.id];
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => toggle(template.id)}
              className={`w-full rounded-xl py-3 px-4 text-sm font-medium transition-all flex items-center gap-3 text-left ${
                active ? 'bg-primary/20 ring-2 ring-primary' : 'bg-muted active:bg-muted/80'
              }`}
            >
              <Icon size={18} strokeWidth={2.5} className="shrink-0 text-foreground/80" />
              <span className="min-w-0 flex-1">
                <span className="block">{t(template.titleKey)}</span>
                <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                  {t(template.hintKey)}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <PopupStickyFooter className="space-y-2">
        <button
          type="button"
          disabled={selected.size === 0 || saving}
          onClick={() => void handleSubmit()}
          className="w-full rounded-2xl bg-green-200 text-green-900 py-3.5 font-semibold disabled:opacity-40 transition-all text-base hover:bg-green-300"
        >
          {saving
            ? t('seed.saving')
            : selected.size === 0
              ? t('seed.pickSome')
              : t('seed.submit', { count: eventCount })}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={handleSkip}
          className="w-full py-2 text-sm font-medium text-muted-foreground underline underline-offset-2"
        >
          {t('seed.skip')}
        </button>
      </PopupStickyFooter>
    </CenteredPopup>
  );
};

export default SeedWeekFlow;
