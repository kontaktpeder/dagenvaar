import { useEffect, useState } from 'react';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { useUpdateEvent, useEventVisibleMembers, syncEventVisibleMembers, type Event } from '@/hooks/useEvents';
import { DAY_PART_LABELS } from '@/lib/colors';
import { CATEGORY_OPTIONS, EVENT_CATEGORY_META, type EventCategory } from '@/lib/eventCategories';
import {
  DAY_PART_ORDER,
  DAY_PART_TIME_RANGES,
  timeRangeToDayParts,
} from '@/lib/dayParts';
import { buildEventUpdatePatch } from '@/lib/buildEventUpdatePatch';
import type { HouseholdMember } from '@/hooks/useHousehold';
import CenteredPopup from '@/components/CenteredPopup';
import PopupStickyFooter from '@/components/PopupStickyFooter';
import { scrollFocusIntoView } from '@/lib/scrollFocusIntoView';

interface EditEventQuickSheetProps {
  event: Event;
  householdId: string;
  currentMemberId: string;
  members?: HouseholdMember[];
  onClose: () => void;
  onSaved?: (eventId: string, dateStr: string) => void;
  onOpenFullEdit?: (event: Event) => void;
}

const FIELD =
  'min-w-0 box-border appearance-none rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary';
const ADD_BTN =
  'shrink-0 rounded-xl bg-muted hover:bg-muted/80 px-3 py-3 text-sm font-medium whitespace-nowrap min-w-[4.75rem] transition-all';

const EditEventQuickSheet = ({ event, members = [], currentMemberId, onClose, onSaved, onOpenFullEdit }: EditEventQuickSheetProps) => {
  const updateEvent = useUpdateEvent();

  const initStartIdx = (() => {
    const dps = (event as any).day_part_start as string | null;
    const idx = DAY_PART_ORDER.indexOf(dps as any);
    return idx >= 0 ? idx : 2;
  })();
  const initEndIdx = (() => {
    const dpe = (event as any).day_part_end as string | null;
    const idx = DAY_PART_ORDER.indexOf(dpe as any);
    return idx >= 0 ? idx : initStartIdx;
  })();

  const [title, setTitle] = useState(event.title);
  const [startDate, setStartDate] = useState(new Date(event.event_date + 'T12:00:00'));
  const [endDate, setEndDate] = useState<Date | null>(
    (event as any).end_date && (event as any).end_date !== event.event_date
      ? new Date((event as any).end_date + 'T12:00:00')
      : null,
  );
  const [selectedDayParts, setSelectedDayParts] = useState<[number, number]>([initStartIdx, initEndIdx]);
  const [dayPartClickCount, setDayPartClickCount] = useState(initStartIdx === initEndIdx ? 1 : 2);
  const [startTime, setStartTime] = useState(event.start_time?.slice(0, 5) || DAY_PART_TIME_RANGES[DAY_PART_ORDER[initStartIdx]].start);
  const [endTime, setEndTime] = useState<string | null>(event.end_time?.slice(0, 5) || null);
  const [showDayParts, setShowDayParts] = useState(false);
  const [category, setCategory] = useState<EventCategory>((event.category as EventCategory) || 'other');
  const [otherLabel, setOtherLabel] = useState<string>((event as any).category_label_override || '');
  const [visibility, setVisibility] = useState<'all_members' | 'private' | 'selected_members'>(
    (event.visibility_type as any) || 'all_members',
  );
  const { data: existingVisibleIds } = useEventVisibleMembers(
    event.visibility_type === 'selected_members' ? event.id : undefined,
  );
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  useEffect(() => {
    if (existingVisibleIds) setSelectedMemberIds(existingVisibleIds);
  }, [existingVisibleIds]);
  const [location, setLocation] = useState(event.location || '');
  const [notes, setNotes] = useState(event.notes || '');

  const dayPartStart = DAY_PART_ORDER[selectedDayParts[0]];
  const dayPartEnd = DAY_PART_ORDER[selectedDayParts[1]];

  const syncTimesFromDayPart = (startIdx: number, endIdx: number) => {
    const range = DAY_PART_TIME_RANGES[DAY_PART_ORDER[startIdx]];
    const rangeEnd = DAY_PART_TIME_RANGES[DAY_PART_ORDER[endIdx]];
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

  const addOneHour = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const total = ((h * 60 + (m || 0) + 60) % (24 * 60) + 24 * 60) % (24 * 60);
    const nh = Math.floor(total / 60);
    const nm = total % 60;
    return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
  };

  const handleAddHour = () => {
    if (!endTime) setEndTime(addOneHour(startTime || '12:00'));
    else setEndTime(addOneHour(endTime));
  };

  const isDayPartSelected = (idx: number) => idx >= selectedDayParts[0] && idx <= selectedDayParts[1];

  const handleAddDay = () => {
    if (!endDate) setEndDate(addDays(startDate, 1));
    else setEndDate(addDays(endDate, 1));
  };

  const canSave =
    title.trim().length > 0 &&
    !!category &&
    (visibility !== 'selected_members' || selectedMemberIds.length > 0);

  const handleSubmit = async () => {
    if (!canSave) return;
    try {
      await updateEvent.mutateAsync({
        id: event.id,
        patch: buildEventUpdatePatch({
          title,
          startDate,
          endDate,
          dayPartStart,
          dayPartEnd,
          startTime,
          endTime: endTime || '',
          category,
          otherLabel,
          visibility,
          location,
          notes,
        }),
      });
      try {
        await syncEventVisibleMembers(
          event.id,
          visibility === 'selected_members' ? selectedMemberIds : [],
        );
      } catch (syncErr: any) {
        console.error('[EditEventQuickSheet] sync visible members failed', syncErr);
        toast.error('Endringene ble lagret, men delingen feilet.');
      }
      onSaved?.(event.id, format(startDate, 'yyyy-MM-dd'));
      onClose();
    } catch (err: any) {
      console.error('[EditEventQuickSheet] update failed', err);
      toast.error(err?.message || 'Kunne ikke lagre endringene');
    }
  };

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{children}</h3>
  );

  return (
    <CenteredPopup onClose={onClose} zClassName="z-[70]">
      <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
        <h2 className="text-lg font-bold">Rask redigering</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-5 min-h-0">
          {/* Tittel */}
          <div>
            <SectionTitle>Tittel</SectionTitle>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Hva skal skje?"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Dato */}
          <div>
            <SectionTitle>Dato</SectionTitle>
            <div className="flex gap-2">
              <input
                type="date"
                value={format(startDate, 'yyyy-MM-dd')}
                onChange={(e) => {
                  const d = new Date(e.target.value + 'T12:00:00');
                  setStartDate(d);
                  if (endDate && endDate <= d) setEndDate(null);
                }}
                className={`flex-1 ${FIELD}`}
              />
              <button type="button" onClick={handleAddDay} className={ADD_BTN}>
                +1 dag
              </button>
            </div>
            {endDate && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="date"
                  value={format(endDate, 'yyyy-MM-dd')}
                  onChange={(e) => setEndDate(new Date(e.target.value + 'T12:00:00'))}
                  min={format(addDays(startDate, 1), 'yyyy-MM-dd')}
                  className={`flex-1 ${FIELD}`}
                />
                <button type="button" onClick={() => setEndDate(null)} className="p-2 rounded-full hover:bg-muted text-muted-foreground">
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </button>
              </div>
            )}
          </div>

          {/* Klokke — same size as date */}
          <div className="space-y-3">
            <SectionTitle>Klokke</SectionTitle>
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
            {endTime && (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => handleEndTimeChange(e.target.value)}
                  className={`flex-1 ${FIELD}`}
                />
                <button type="button" onClick={() => setEndTime(null)} className="p-2 rounded-full hover:bg-muted text-muted-foreground">
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                </button>
              </div>
            )}
          </div>

          {/* Del av dagen — optional */}
          <div>
            {!showDayParts ? (
              <button
                type="button"
                onClick={() => setShowDayParts(true)}
                className="text-sm text-muted-foreground underline underline-offset-2"
              >
                Velg del av dagen
              </button>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <SectionTitle>Del av dagen</SectionTitle>
                  <button
                    type="button"
                    onClick={() => setShowDayParts(false)}
                    className="text-xs text-muted-foreground underline underline-offset-2 mb-2"
                  >
                    Skjul
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {DAY_PART_ORDER.map((key, idx) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleDayPartClick(idx)}
                      className={`rounded-xl py-2.5 px-3 text-sm font-medium transition-all ${
                        isDayPartSelected(idx)
                          ? 'bg-calendar-accent text-foreground ring-2 ring-calendar-accent'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {DAY_PART_LABELS[key]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sted & Notat */}
          <div className="space-y-3">
            <div>
              <SectionTitle>Sted</SectionTitle>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Valgfritt"
                onFocus={scrollFocusIntoView}
                className={`w-full ${FIELD}`}
              />
            </div>
            <div>
              <SectionTitle>Notat</SectionTitle>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Valgfritt"
                rows={2}
                onFocus={scrollFocusIntoView}
                className={`w-full ${FIELD} resize-none`}
              />
            </div>
          </div>

          {/* Type */}
          <div>
            <SectionTitle>Type</SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORY_OPTIONS.map((key) => {
                const meta = EVENT_CATEGORY_META[key];
                const Icon = meta.Icon;
                const selected = category === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setCategory(key);
                      if (key !== 'other') setOtherLabel('');
                    }}
                    className={`rounded-xl py-2.5 px-3 text-sm font-medium transition-all flex items-center justify-between ${
                      selected ? `${meta.chipBg} ring-2 ring-current ${meta.iconColor}` : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    <span>{meta.label}</span>
                    <Icon size={16} strokeWidth={2.5} className={meta.iconColor} />
                  </button>
                );
              })}
            </div>
            {category === 'other' && (
              <input
                type="text"
                value={otherLabel}
                onChange={(e) => setOtherLabel(e.target.value)}
                placeholder="f.eks. Reise, Familie, Helse"
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </div>

          {/* Synlighet */}
          <div>
            <SectionTitle>Synlighet</SectionTitle>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'all_members' as const, label: 'Alle' },
                { value: 'private' as const, label: 'Bare meg' },
                { value: 'selected_members' as const, label: 'Valgte' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setVisibility(opt.value)}
                  className={`rounded-xl py-2.5 px-3 text-sm font-medium transition-all ${
                    visibility === opt.value ? 'bg-primary/20 ring-2 ring-primary' : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {visibility === 'selected_members' && (
              <div className="mt-3 rounded-xl bg-muted/50 p-3">
                <div className="flex flex-col gap-1.5">
                  {members.filter((m) => m.id !== currentMemberId).map((m) => {
                    const checked = selectedMemberIds.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMemberIds((prev) => checked ? prev.filter((id) => id !== m.id) : [...prev, m.id])}
                        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all ${checked ? 'bg-primary/20 ring-2 ring-primary' : 'bg-background hover:bg-muted'}`}
                      >
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                          style={{ backgroundColor: `hsl(var(--member-${m.color_token.replace('pastel-', '')}))` }}>
                          {m.display_name.charAt(0)}
                        </span>
                        <span className="flex-1 text-sm font-medium">{m.display_name}</span>
                        <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${checked ? 'bg-primary border-primary' : 'border-border'}`}>
                          {checked && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </span>
                      </button>
                    );
                  })}
                  {members.filter((m) => m.id !== currentMemberId).length === 0 && (
                    <p className="text-xs text-muted-foreground">Ingen andre medlemmer å dele med enda.</p>
                  )}
                </div>
                {selectedMemberIds.length === 0 && (
                  <p className="text-xs text-destructive mt-2">Velg minst én person.</p>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <PopupStickyFooter className="px-5 pt-3 border-t border-border">
          <button
            onClick={handleSubmit}
            disabled={!canSave || updateEvent.isPending}
            className="w-full rounded-2xl bg-green-200 text-green-900 py-3.5 font-semibold disabled:opacity-40 hover:bg-green-300 active:scale-95 transition-all"
          >
            {updateEvent.isPending ? 'Lagrer...' : 'Lagre'}
          </button>
        </PopupStickyFooter>
    </CenteredPopup>
  );
};

export default EditEventQuickSheet;
