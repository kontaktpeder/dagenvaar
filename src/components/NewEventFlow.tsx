import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { useCreateEvent } from '@/hooks/useEvents';
import { DAY_PART_LABELS } from '@/lib/colors';
import { CATEGORY_OPTIONS, EVENT_CATEGORY_META, type EventCategory } from '@/lib/eventCategories';
import type { HouseholdMember } from '@/hooks/useHousehold';

interface NewEventFlowProps {
  householdId: string;
  members: HouseholdMember[];
  currentMemberId: string;
  initialDate?: Date;
  onClose: () => void;
}

const STEPS = 4;

const NewEventFlow = ({ householdId, members, currentMemberId, initialDate, onClose }: NewEventFlowProps) => {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(initialDate || new Date());
  const [dayPart, setDayPart] = useState('afternoon');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [showTimeFields, setShowTimeFields] = useState(false);
  const [category, setCategory] = useState<EventCategory | null>(null);
  const [visibility, setVisibility] = useState<'all_members' | 'private' | 'selected_members'>('all_members');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const createEvent = useCreateEvent();

  const canProceed = step === 1 ? title.trim().length > 0 : true;

  const handleSubmit = async () => {
    await createEvent.mutateAsync({
      household_id: householdId,
      owner_member_id: currentMemberId,
      title: title.trim(),
      event_date: format(date, 'yyyy-MM-dd'),
      day_part: dayPart,
      start_time: startTime || null,
      end_time: endTime || null,
      visibility_type: visibility,
      location: location || null,
      notes: notes || null,
      category: category || null,
    });
    onClose();
  };

  const dayParts = Object.entries(DAY_PART_LABELS);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <button onClick={step > 1 ? () => setStep((s) => s - 1) : onClose} className="p-2 rounded-full hover:bg-muted">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 15L7 10L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div className="flex gap-1.5">
          {Array.from({ length: STEPS }).map((_, i) => (
            <div key={i} className={`w-8 h-1.5 rounded-full transition-colors ${i < step ? 'bg-primary' : 'bg-border'}`} />
          ))}
        </div>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-muted text-muted-foreground">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 overflow-y-auto pb-8">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }} className="space-y-6">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Steg 1 av 3</p>
                <h2 className="text-2xl font-bold">Hva skal skje?</h2>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="F.eks. Middag med venner"
                autoFocus
                className="w-full rounded-2xl border border-border bg-background px-5 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }} className="space-y-6">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Steg 2 av 3</p>
                <h2 className="text-2xl font-bold">Når?</h2>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Dato</label>
                <input
                  type="date"
                  value={format(date, 'yyyy-MM-dd')}
                  onChange={(e) => setDate(new Date(e.target.value + 'T12:00:00'))}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-3 block">Del av dagen</label>
                <div className="grid grid-cols-2 gap-2">
                  {dayParts.map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setDayPart(key)}
                      className={`rounded-xl py-3 px-4 text-sm font-medium transition-all ${
                        dayPart === key
                          ? 'bg-primary text-primary-foreground ring-2 ring-primary'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {!showTimeFields ? (
                <button
                  onClick={() => setShowTimeFields(true)}
                  className="text-sm text-muted-foreground underline underline-offset-2"
                >
                  + Legg til klokkeslett
                </button>
              ) : (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Fra</label>
                      <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Til</label>
                      <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Sted</label>
                    <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Valgfritt"
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Notat</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Valgfritt" rows={2}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }} className="space-y-6">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Steg 3 av 4</p>
                <h2 className="text-2xl font-bold">Type hendelse</h2>
              </div>

              <div>
                <label className="text-sm font-medium mb-3 block">Kategori (valgfritt)</label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORY_OPTIONS.map((key) => {
                    const meta = EVENT_CATEGORY_META[key];
                    const Icon = meta.Icon;
                    const selected = category === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setCategory(selected ? null : key)}
                        className={`rounded-xl py-3 px-4 text-sm font-medium transition-all flex items-center gap-2 ${
                          selected
                            ? 'bg-primary text-primary-foreground ring-2 ring-primary'
                            : 'bg-muted hover:bg-muted/80'
                        }`}
                      >
                        <Icon size={16} />
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>

            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="step4" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }} className="space-y-6">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Steg 4 av 4</p>
                <h2 className="text-2xl font-bold">Hvem kan se?</h2>
              </div>

              <div className="space-y-3">
                {[
                  { value: 'all_members' as const, label: 'Alle', desc: 'Synlig for alle i hjemmet' },
                  { value: 'private' as const, label: 'Bare meg', desc: 'Kun synlig for deg' },
                  { value: 'selected_members' as const, label: 'Valgte personer', desc: 'Velg hvem som kan se' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setVisibility(opt.value)}
                    className={`w-full text-left rounded-2xl p-4 transition-all ${
                      visibility === opt.value
                        ? 'bg-primary/20 ring-2 ring-primary'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    <p className="font-semibold">{opt.label}</p>
                    <p className="text-sm text-muted-foreground">{opt.desc}</p>
                  </button>
                ))}
              </div>

              {/* Summary */}
              <div className="rounded-2xl bg-muted p-4 mt-4">
                <p className="text-sm text-muted-foreground mb-1">Oppsummering</p>
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-muted-foreground">
                  {format(date, 'd. MMMM yyyy', { locale: nb })} · {DAY_PART_LABELS[dayPart]}
                  {startTime && ` · ${startTime}`}
                  {endTime && `–${endTime}`}
                </p>
                {category && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {EVENT_CATEGORY_META[category].label}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom button */}
      <div className="px-5 pb-8 pt-4">
        <button
          onClick={step < STEPS ? () => setStep((s) => s + 1) : handleSubmit}
          disabled={!canProceed || createEvent.isPending}
          className="w-full rounded-2xl bg-primary py-4 font-semibold text-primary-foreground disabled:opacity-40 transition-all text-lg"
        >
          {step < STEPS ? 'Neste' : createEvent.isPending ? 'Lagrer...' : 'Opprett hendelse ✨'}
        </button>
      </div>
    </motion.div>
  );
};

export default NewEventFlow;
