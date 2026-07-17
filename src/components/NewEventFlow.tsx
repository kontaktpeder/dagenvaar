import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays } from 'date-fns';
import { nb } from 'date-fns/locale';
import { toast } from 'sonner';
import { useCreateEvent, syncEventVisibleMembers } from '@/hooks/useEvents';
import { DAY_PART_LABELS } from '@/lib/colors';
import { CATEGORY_OPTIONS, EVENT_CATEGORY_META, type EventCategory } from '@/lib/eventCategories';
import { resolveCategoryLabel } from '@/lib/categoryPresentation';
import {
  DAY_PART_ORDER,
  DAY_PART_TIME_RANGES,
  timeRangeToDayParts,
} from '@/lib/dayParts';
import type { HouseholdMember } from '@/hooks/useHousehold';
import CenteredPopup from '@/components/CenteredPopup';
import PopupStickyFooter from '@/components/PopupStickyFooter';
import { focusFieldSoftly, scrollFocusIntoView } from '@/lib/scrollFocusIntoView';

/** Shared size for date/time inputs — equality = simplicity */
const FIELD =
  'min-w-0 box-border appearance-none rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary';
const ADD_BTN =
  'shrink-0 rounded-xl bg-muted hover:bg-muted/80 px-3 py-3 text-sm font-medium whitespace-nowrap min-w-[4.75rem] transition-all';
const CTA_BTN =
  'rounded-xl bg-muted hover:bg-muted/80 px-4 py-3 text-sm font-medium transition-all';

interface NewEventFlowProps {
  householdId: string;
  members: HouseholdMember[];
  currentMemberId: string;
  initialDate?: Date;
  onClose: () => void;
  onCreated?: (eventId: string, dateStr: string) => void;
}

const STEPS = 4;

const NewEventFlow = ({ householdId, members, currentMemberId, initialDate, onClose, onCreated }: NewEventFlowProps) => {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(initialDate || new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedDayParts, setSelectedDayParts] = useState<[number, number]>([2, 2]); // default afternoon
  const [dayPartClickCount, setDayPartClickCount] = useState(1);
  const [startTime, setStartTime] = useState('12:00');
  const [endTime, setEndTime] = useState<string | null>(null);
  const [showDayParts, setShowDayParts] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [category, setCategory] = useState<EventCategory | null>(null);
  const [otherLabel, setOtherLabel] = useState('');
  const [visibility, setVisibility] = useState<'all_members' | 'private' | 'selected_members'>('all_members');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const createEvent = useCreateEvent();
  const locationRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const addOneHour = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const total = ((h * 60 + (m || 0) + 60) % (24 * 60) + 24 * 60) % (24 * 60);
    const nh = Math.floor(total / 60);
    const nm = total % 60;
    return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
  };

  const handleDismiss = () => {
    if (step > 1) setStep((s) => s - 1);
    else onClose();
  };

  const openLocation = () => setShowLocation(true);
  const openNotes = () => setShowNotes(true);

  useEffect(() => {
    if (!showLocation) return;
    const t = window.setTimeout(() => focusFieldSoftly(locationRef.current), 40);
    return () => window.clearTimeout(t);
  }, [showLocation]);

  useEffect(() => {
    if (!showNotes) return;
    const t = window.setTimeout(() => focusFieldSoftly(notesRef.current), 40);
    return () => window.clearTimeout(t);
  }, [showNotes]);

  // Soft focus on title step — preventScroll avoids calendar/popup jump
  useEffect(() => {
    if (step !== 3) return;
    const t = window.setTimeout(() => {
      const el = titleRef.current;
      if (!el) return;
      try {
        el.focus({ preventScroll: true });
      } catch {
        el.focus();
      }
    }, 80);
    return () => window.clearTimeout(t);
  }, [step]);

  const canProceed =
    step === 2 ? category !== null :
    step === 3 ? title.trim().length > 0 :
    step === 4 ? (visibility !== 'selected_members' || selectedMemberIds.length > 0) :
    true;

  const dayPartStart = DAY_PART_ORDER[selectedDayParts[0]];
  const dayPartEnd = DAY_PART_ORDER[selectedDayParts[1]];
  const dayPartCompat = (!dayPartStart || dayPartStart === 'all_day' || dayPartStart === 'full_diem') ? 'morning' : dayPartStart;

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
    const key = DAY_PART_ORDER[idx];
    if (key === 'all_day' || key === 'full_diem') {
      setSelectedDayParts([idx, idx]);
      setDayPartClickCount(1);
      syncTimesFromDayPart(idx, idx);
      return;
    }
    let newRange: [number, number];
    if (dayPartClickCount === 1) {
      const prev = selectedDayParts[0];
      const prevKey = DAY_PART_ORDER[prev];
      if (prev === idx) return;
      // If previous selection was a snap-only part, restart range
      if (prevKey === 'all_day' || prevKey === 'full_diem') {
        newRange = [idx, idx];
        setDayPartClickCount(2);
      } else {
        newRange = [Math.min(prev, idx), Math.max(prev, idx)];
        setDayPartClickCount(2);
      }
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
    } else if (value) {
      const [idx] = timeRangeToDayParts(value, value);
      setSelectedDayParts([idx, idx]);
      setDayPartClickCount(1);
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

  const handleAddHour = () => {
    if (!endTime) {
      setEndTime(addOneHour(startTime || '12:00'));
    } else {
      setEndTime(addOneHour(endTime));
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
    if (!householdId || !currentMemberId) {
      toast.error('Kunne ikke opprette: mangler husholdning eller medlem');
      return;
    }
    const eventEndDate = endDate ? format(endDate, 'yyyy-MM-dd') : format(startDate, 'yyyy-MM-dd');
    const dateStr = format(startDate, 'yyyy-MM-dd');
    try {
      const result = await createEvent.mutateAsync({
        household_id: householdId,
        title: title.trim(),
        event_date: dateStr,
        end_date: eventEndDate,
        day_part: dayPartCompat,
        day_part_start: dayPartStart || null,
        day_part_end: dayPartEnd || null,
        start_time: (dayPartStart === 'full_diem' && dayPartEnd === 'full_diem') ? '00:00' : (startTime || null),
        end_time: (dayPartStart === 'full_diem' && dayPartEnd === 'full_diem') ? '23:59' : (endTime || null),
        visibility_type: visibility,
        location: location || null,
        notes: notes || null,
        category: category!,
        category_label_override: category === 'other' ? (otherLabel.trim() || null) : null,
      });
      if (visibility === 'selected_members') {
        try {
          await syncEventVisibleMembers(result.id, selectedMemberIds);
        } catch (syncErr: any) {
          console.error('[NewEventFlow] sync visible members failed', syncErr);
          toast.error('Hendelsen ble opprettet, men delingen feilet.');
        }
      }
      onCreated?.(result.id, dateStr);
      onClose();
    } catch (err: any) {
      console.error('[NewEventFlow] create failed', err);
      toast.error(err?.message || 'Kunne ikke lagre hendelsen');
    }
  };

  const getDayPartRangeLabel = () => {
    const startLabel = DAY_PART_LABELS[DAY_PART_ORDER[selectedDayParts[0]]];
    const endLabel = DAY_PART_LABELS[DAY_PART_ORDER[selectedDayParts[1]]];
    if (DAY_PART_ORDER[selectedDayParts[0]] === 'full_diem') return 'Hele døgnet';
    if (DAY_PART_ORDER[selectedDayParts[0]] === 'all_day') return 'Hele dagen';
    if (selectedDayParts[0] === selectedDayParts[1]) return startLabel;
    return `${startLabel} – ${endLabel}`;
  };

  return (
    <CenteredPopup onClose={handleDismiss} size="sheet" zClassName="z-[70]">
      {/* Header: X closes entire flow; backdrop = step back */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0">
        <div className="w-9" aria-hidden />
        <div className="flex gap-1.5">
          {Array.from({ length: STEPS }).map((_, i) => (
            <div key={i} className={`w-8 h-1.5 rounded-full transition-colors ${i < step ? 'bg-calendar-accent' : 'bg-border'}`} />
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground"
          aria-label="Lukk"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 overflow-y-auto min-h-0 pb-4 overscroll-contain">
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
                    className={`flex-1 ${FIELD}`}
                  />
                  <button type="button" onClick={handleAddDay} className={ADD_BTN}>
                    +1 dag
                  </button>
                </div>
              </div>

              {/* End date (if multi-day) */}
              {endDate && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <label className="text-sm font-medium mb-2 block">Sluttdato</label>
                    <input
                      type="date"
                      value={format(endDate, 'yyyy-MM-dd')}
                      onChange={(e) => setEndDate(new Date(e.target.value + 'T12:00:00'))}
                      min={format(addDays(startDate, 1), 'yyyy-MM-dd')}
                      className={`w-full ${FIELD}`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setEndDate(null)}
                    className="mt-7 p-2 rounded-full hover:bg-muted text-muted-foreground"
                  >
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  </button>
                </div>
              )}

              {/* Clock — same field size as date */}
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Klokke</label>
                  <div className="flex gap-2">
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => handleStartTimeChange(e.target.value)}
                      className={`flex-1 ${FIELD}`}
                    />
                    <button type="button" onClick={handleAddHour} className={ADD_BTN}>
                      +1 time
                    </button>
                  </div>
                </div>

                {endTime && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <label className="text-sm font-medium mb-2 block">Slutttid</label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => handleEndTimeChange(e.target.value)}
                        className={`w-full ${FIELD}`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setEndTime(null)}
                      className="mt-7 p-2 rounded-full hover:bg-muted text-muted-foreground"
                    >
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    </button>
                  </div>
                )}

                {!showDayParts ? (
                  <button
                    type="button"
                    onClick={() => setShowDayParts(true)}
                    className="text-sm text-muted-foreground underline underline-offset-2"
                  >
                    Velg del av dagen
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Del av dagen</label>
                      <button
                        type="button"
                        onClick={() => setShowDayParts(false)}
                        className="text-xs text-muted-foreground underline underline-offset-2"
                      >
                        Skjul
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {DAY_PART_ORDER.map((key, idx) => {
                        const selected = isDayPartSelected(idx);
                        return (
                          <button
                            key={key}
                            type="button"
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
                )}
              </div>

              {/* Optional details — closed by default, expand without layout thrash */}
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {!showLocation && (
                    <button type="button" onClick={openLocation} className={CTA_BTN}>
                      Velg sted
                    </button>
                  )}
                  {!showNotes && (
                    <button type="button" onClick={openNotes} className={CTA_BTN}>
                      Skriv notat
                    </button>
                  )}
                </div>

                {showLocation && (
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <label className="text-sm font-medium mb-1 block">Sted</label>
                      <input
                        ref={locationRef}
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Valgfritt"
                        onFocus={scrollFocusIntoView}
                        className={`w-full ${FIELD}`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => { setShowLocation(false); setLocation(''); }}
                      className="mt-7 p-2 rounded-full hover:bg-muted text-muted-foreground"
                    >
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    </button>
                  </div>
                )}

                {showNotes && (
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <label className="text-sm font-medium mb-1 block">Notat</label>
                      <textarea
                        ref={notesRef}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Valgfritt"
                        rows={2}
                        onFocus={scrollFocusIntoView}
                        className={`w-full ${FIELD} resize-none`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => { setShowNotes(false); setNotes(''); }}
                      className="mt-7 p-2 rounded-full hover:bg-muted text-muted-foreground"
                    >
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    </button>
                  </div>
                )}
              </div>
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
                        setCategory(key);
                        if (key !== 'other') {
                          setOtherLabel('');
                          setStep((s) => s + 1);
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
              {category === 'other' && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}>
                  <label className="text-sm font-medium mb-2 block">Egen kategori (valgfritt)</label>
                  <input
                    type="text"
                    value={otherLabel}
                    onChange={(e) => setOtherLabel(e.target.value)}
                    placeholder="F.eks. Trening, Lege, Reise..."
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-2">La stå tom hvis du bare vil bruke "Annet".</p>
                </motion.div>
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }} className="space-y-6">
              <h2 className="text-2xl font-bold">Hva skal skje?</h2>
              <input
                ref={titleRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={category === 'other' && otherLabel.trim() ? otherLabel : 'F.eks. Middag med venner'}
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

              {visibility === 'selected_members' && (
                <div className="rounded-2xl bg-muted/50 p-4">
                  <p className="text-sm font-semibold mb-3">Velg hvem som skal se</p>
                  <div className="flex flex-col gap-2">
                    {members.filter((m) => m.id !== currentMemberId).map((m) => {
                      const checked = selectedMemberIds.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelectedMemberIds((prev) => checked ? prev.filter((id) => id !== m.id) : [...prev, m.id])}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${checked ? 'bg-primary/20 ring-2 ring-primary' : 'bg-background hover:bg-muted'}`}
                        >
                          <span
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ backgroundColor: `hsl(var(--member-${m.color_token.replace('pastel-', '')}))` }}
                          >
                            {m.display_name.charAt(0)}
                          </span>
                          <span className="flex-1 text-sm font-medium">{m.display_name}</span>
                          <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${checked ? 'bg-primary border-primary' : 'border-border'}`}>
                            {checked && (
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            )}
                          </span>
                        </button>
                      );
                    })}
                    {members.filter((m) => m.id !== currentMemberId).length === 0 && (
                      <p className="text-sm text-muted-foreground">Ingen andre medlemmer å dele med enda.</p>
                    )}
                  </div>
                  {selectedMemberIds.length === 0 && (
                    <p className="text-xs text-destructive mt-2">Velg minst én person for å fortsette.</p>
                  )}
                </div>
              )}



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
                  {endTime ? `–${endTime}` : ''}
                </p>
                {category && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {resolveCategoryLabel(category, otherLabel)}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <PopupStickyFooter>
        <button
          onClick={step < STEPS ? () => setStep((s) => s + 1) : handleSubmit}
          disabled={!canProceed || createEvent.isPending}
          className="w-full rounded-2xl bg-green-200 text-green-900 py-3.5 font-semibold disabled:opacity-40 transition-all text-base hover:bg-green-300 active:scale-95"
        >
          {step < STEPS ? 'Neste' : createEvent.isPending ? 'Lagrer...' : 'Opprett hendelse'}
        </button>
      </PopupStickyFooter>
    </CenteredPopup>
  );
};

export default NewEventFlow;
