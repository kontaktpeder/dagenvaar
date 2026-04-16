import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays } from 'date-fns';
import { nb } from 'date-fns/locale';
import { useCreateEvent } from '@/hooks/useEvents';
import { DAY_PART_LABELS } from '@/lib/colors';
import { CATEGORY_OPTIONS, EVENT_CATEGORY_META, type EventCategory } from '@/lib/eventCategories';
import {
  DAY_PART_ORDER,
  DAY_PART_TIME_RANGES,
  timeRangeToDayParts,
} from '@/lib/dayParts';
import type { HouseholdMember } from '@/hooks/useHousehold';

interface NewEventFlowProps {
  householdId: string;
  members: HouseholdMember[];
  currentMemberId: string;
  initialDate?: Date;
  onClose: () => void;
  onCreated?: (eventId: string, dateStr: string) => void;
}

const STEPS = 4;

const NewEventFlow = ({ householdId, members, currentMemberId, initialDate, onClose }: NewEventFlowProps) => {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(initialDate || new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedDayParts, setSelectedDayParts] = useState<[number, number]>([2, 2]); // default afternoon
  const [dayPartClickCount, setDayPartClickCount] = useState(1);
  const [startTime, setStartTime] = useState('12:00');
  const [endTime, setEndTime] = useState('18:00');
  const [showTimeFields, setShowTimeFields] = useState(false);
  const [category, setCategory] = useState<EventCategory | null>(null);
  const [visibility, setVisibility] = useState<'all_members' | 'private' | 'selected_members'>('all_members');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const createEvent = useCreateEvent();

  const canProceed = step === 3 ? title.trim().length > 0 : true;

  const dayPartStart = DAY_PART_ORDER[selectedDayParts[0]];
  const dayPartEnd = DAY_PART_ORDER[selectedDayParts[1]];
  const dayPartCompat = (!dayPartStart || dayPartStart === 'all_day') ? 'morning' : dayPartStart;

  // --- Two-way sync helpers ---

  const syncTimesFromDayPart = (startIdx: number, endIdx: number) => {
    const startPart = DAY_PART_ORDER[startIdx];
    const endPart = DAY_PART_ORDER[endIdx];
    const range = DAY_PART_TIME_RANGES[startPart];
    const rangeEnd = DAY_PART_TIME_RANGES[endPart];
    setStartTime(range.start === '24:00' ? '00:00' : range.start);
    setEndTime(rangeEnd.end === '24:00' ? '00:00' : rangeEnd.end);
  };

  const handleDayPartClick = (idx: number) => {
    let newRange: [number, number];
    if (dayPartClickCount === 1) {
      const prev = selectedDayParts[0];
      if (prev === idx) return;
      newRange = [Math.min(prev, idx), Math.max(prev, idx)];
      setDayPartClickCount(2);
    } else {
      newRange = [idx, idx];
      setDayPartClickCount(1);
    }
    setSelectedDayParts(newRange);
    syncTimesFromDayPart(newRange[0], newRange[1]);
  };

  const handleStartTimeChange = (value: string) => {
    setStartTime(value);
    if (value && endTime) {
      const newRange = timeRangeToDayParts(value, endTime);
      setSelectedDayParts(newRange);
      setDayPartClickCount(newRange[0] === newRange[1] ? 1 : 2);
    }
  };

  const handleEndTimeChange = (value: string) => {
    setEndTime(value);
    if (startTime && value) {
      const newRange = timeRangeToDayParts(startTime, value);
      setSelectedDayParts(newRange);
      setDayPartClickCount(newRange[0] === newRange[1] ? 1 : 2);
    }
  };

  const isDayPartSelected = (idx: number) => {
    return idx >= selectedDayParts[0] && idx <= selectedDayParts[1];
  };

  const handleAddDay = () => {
    if (!endDate) {
      setEndDate(addDays(startDate, 1));
    } else {
      setEndDate(addDays(endDate, 1));
    }
  };

  const handleSubmit = async () => {
    const eventEndDate = endDate ? format(endDate, 'yyyy-MM-dd') : format(startDate, 'yyyy-MM-dd');
    await createEvent.mutateAsync({
      household_id: householdId,
      owner_member_id: currentMemberId,
      title: title.trim(),
      event_date: format(startDate, 'yyyy-MM-dd'),
      end_date: eventEndDate,
      day_part: dayPartCompat,
      day_part_start: dayPartStart || null,
      day_part_end: dayPartEnd || null,
      start_time: startTime || null,
      end_time: endTime || null,
      visibility_type: visibility,
      location: location || null,
      notes: notes || null,
      category: category || null,
    } as any);
    onClose();
  };

  const getDayPartRangeLabel = () => {
    const startLabel = DAY_PART_LABELS[DAY_PART_ORDER[selectedDayParts[0]]];
    const endLabel = DAY_PART_LABELS[DAY_PART_ORDER[selectedDayParts[1]]];
    if (DAY_PART_ORDER[selectedDayParts[0]] === 'all_day') return 'Hele dagen';
    if (selectedDayParts[0] === selectedDayParts[1]) return startLabel;
    return `${startLabel} – ${endLabel}`;
  };

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
            <div key={i} className={`w-8 h-1.5 rounded-full transition-colors ${i < step ? 'bg-calendar-accent' : 'bg-border'}`} />
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
              <h2 className="text-2xl font-bold">Når?</h2>

              {/* Start date + add day button */}
              <div>
                <label className="text-sm font-medium mb-2 block">Dato</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={format(startDate, 'yyyy-MM-dd')}
                    onChange={(e) => {
                      const newDate = new Date(e.target.value + 'T12:00:00');
                      setStartDate(newDate);
                      if (endDate && endDate <= newDate) setEndDate(null);
                    }}
                    className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={handleAddDay}
                    className="rounded-xl bg-muted hover:bg-muted/80 px-3 py-3 text-sm font-medium whitespace-nowrap transition-all"
                  >
                    +1 dag
                  </button>
                </div>
              </div>

              {/* End date (if multi-day) */}
              {endDate && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="text-sm font-medium mb-2 block">Sluttdato</label>
                      <input
                        type="date"
                        value={format(endDate, 'yyyy-MM-dd')}
                        onChange={(e) => setEndDate(new Date(e.target.value + 'T12:00:00'))}
                        min={format(addDays(startDate, 1), 'yyyy-MM-dd')}
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <button
                      onClick={() => setEndDate(null)}
                      className="mt-7 p-2 rounded-full hover:bg-muted text-muted-foreground"
                    >
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Day part interval selection */}
              <div>
                <label className="text-sm font-medium mb-3 block">Del av dagen</label>
                <div className="grid grid-cols-3 gap-2">
                  {DAY_PART_ORDER.map((key, idx) => {
                    const selected = isDayPartSelected(idx);
                    return (
                      <button
                        key={key}
                        onClick={() => handleDayPartClick(idx)}
                        className={`rounded-xl py-3 px-4 text-sm font-medium transition-all ${
                          selected
                            ? 'bg-calendar-accent text-foreground ring-2 ring-calendar-accent'
                            : 'bg-muted hover:bg-muted/80'
                        }`}
                      >
                        {DAY_PART_LABELS[key]}
                      </button>
                    );
                  })}
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
                      <input type="time" value={startTime} onChange={(e) => handleStartTimeChange(e.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Til</label>
                      <input type="time" value={endTime} onChange={(e) => handleEndTimeChange(e.target.value)}
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

          {step === 2 && (
            <motion.div key="step2" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }} className="space-y-6">
              <h2 className="text-2xl font-bold">Type hendelse</h2>
              <div className="flex flex-col gap-2">
                {CATEGORY_OPTIONS.map((key) => {
                  const meta = EVENT_CATEGORY_META[key];
                  const Icon = meta.Icon;
                  const selected = category === key;
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        if (selected) {
                          setCategory(null);
                        } else {
                          setCategory(key);
                          setTimeout(() => setStep(3), 200);
                        }
                      }}
                      className={`rounded-xl py-3 px-4 text-sm font-medium transition-all flex items-center justify-between ${
                        selected
                          ? `${meta.chipBg} ring-2 ring-current ${meta.iconColor}`
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      <span>{meta.label}</span>
                      <Icon size={18} strokeWidth={2.5} className={meta.iconColor} />
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground text-center">Valgfritt — du kan hoppe over</p>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }} className="space-y-6">
              <h2 className="text-2xl font-bold">Hva skal skje?</h2>
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

          {step === 4 && (
            <motion.div key="step4" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }} className="space-y-6">
              <h2 className="text-2xl font-bold">Hvem kan se?</h2>

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
                  {format(startDate, 'd. MMMM yyyy', { locale: nb })}
                  {endDate && ` → ${format(endDate, 'd. MMMM yyyy', { locale: nb })}`}
                  {' · '}
                  {getDayPartRangeLabel()}
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
          className="w-full rounded-2xl bg-green-200 text-green-900 py-4 font-semibold disabled:opacity-40 transition-all text-lg hover:bg-green-300 active:scale-95"
        >
          {step < STEPS ? 'Neste' : createEvent.isPending ? 'Lagrer...' : 'Opprett hendelse ✨'}
        </button>
      </div>
    </motion.div>
  );
};

export default NewEventFlow;
