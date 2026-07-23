import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
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
  const [selected, setSelected] = useState<Set<SeedTemplateId>>(() => new Set(['training', 'date_night', 'dinner_home']));
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
    <CenteredPopup onClose={handleSkip} onExit={handleSkip} size="sheet" zClassName="z-[70]">
      <div className="px-5 pt-1 pb-2 shrink-0">
        <h2 className="text-xl font-bold">{t('seed.title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('seed.subtitle')}</p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-touch px-5 pb-3 space-y-2" data-sheet-scroll>
        {SEED_TEMPLATES.map((template, i) => {
          const active = selected.has(template.id);
          const Icon = ICONS[template.id];
          return (
            <motion.button
              key={template.id}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => toggle(template.id)}
              className={`w-full text-left rounded-2xl p-3.5 flex items-center gap-3 transition-all ${
                active ? 'bg-primary/20 ring-2 ring-primary' : 'bg-muted active:bg-muted/70'
              }`}
            >
              <span
                className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  active ? 'bg-primary/30' : 'bg-background'
                }`}
              >
                <Icon size={18} strokeWidth={2} className="text-foreground" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="font-semibold text-sm block">{t(template.titleKey)}</span>
                <span className="text-xs text-muted-foreground block mt-0.5">{t(template.hintKey)}</span>
              </span>
              <span
                className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  active ? 'border-primary bg-primary' : 'border-border bg-background'
                }`}
              >
                {active && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                    <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
            </motion.button>
          );
        })}
      </div>

      <PopupStickyFooter className="space-y-2">
        <button
          type="button"
          disabled={selected.size === 0 || saving}
          onClick={() => void handleSubmit()}
          className="w-full rounded-2xl bg-green-200 text-green-900 py-3.5 font-semibold disabled:opacity-50"
        >
          {saving
            ? t('seed.saving')
            : t('seed.submit', { count: eventCount })}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={handleSkip}
          className="w-full rounded-2xl bg-muted py-3 font-medium text-muted-foreground"
        >
          {t('seed.skip')}
        </button>
      </PopupStickyFooter>
    </CenteredPopup>
  );
};

export default SeedWeekFlow;
