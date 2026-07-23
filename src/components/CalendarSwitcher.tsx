import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { calendarKindLabel, resolveCalendarKind } from '@/lib/calendarKinds';
import type { CalendarMembership } from '@/hooks/useCurrentHouseholdContext';
import type { Household } from '@/hooks/useHousehold';

interface CalendarSwitcherProps {
  household: Household;
  memberships: CalendarMembership[];
  stackIndex?: number;
  onSelect: (householdId: string) => void;
}

const CalendarSwitcher = ({
  household,
  memberships,
  stackIndex = 0,
  onSelect,
}: CalendarSwitcherProps) => {
  const [open, setOpen] = useState(false);
  const canSwitch = memberships.length > 1;

  const homes = memberships.filter((m) => resolveCalendarKind(m.household) === 'home');
  const works = memberships.filter((m) => resolveCalendarKind(m.household) === 'work');

  return (
    <div className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={() => canSwitch && setOpen((v) => !v)}
        className={`flex items-center gap-2 min-w-0 max-w-full text-left ${
          canSwitch ? 'cursor-pointer' : 'cursor-default'
        }`}
        aria-expanded={canSwitch ? open : undefined}
        aria-haspopup={canSwitch ? 'listbox' : undefined}
      >
        {canSwitch && (
          <span className="flex items-center gap-1.5 shrink-0 self-center" aria-hidden>
            <span className="flex flex-col gap-1">
              {memberships.map((m, i) => (
                <span
                  key={m.household_id}
                  className={`w-1.5 h-1.5 rounded-full ${
                    i === stackIndex ? 'bg-foreground/70' : 'bg-border'
                  }`}
                />
              ))}
            </span>
            <ChevronDown
              size={18}
              strokeWidth={2.25}
              className={`text-muted-foreground transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
            />
          </span>
        )}
        <span className="min-w-0">
          <span className="block text-xl font-bold tracking-tight truncate">{household.name}</span>
          <span className="block text-[11px] font-medium text-muted-foreground leading-tight">
            {calendarKindLabel(household)}
          </span>
        </span>
      </button>

      {open && canSwitch && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Lukk"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute left-0 top-full mt-2 z-50 w-[min(100vw-2.5rem,18rem)] rounded-2xl border border-border bg-background shadow-lg p-2"
            role="listbox"
          >
            {homes.length > 0 && (
              <div className={works.length > 0 ? 'mb-1' : undefined}>
                {homes.map((m) => (
                  <SwitcherRow
                    key={m.household_id}
                    name={m.household.name}
                    active={m.household_id === household.id}
                    onClick={() => {
                      onSelect(m.household_id);
                      setOpen(false);
                    }}
                  />
                ))}
              </div>
            )}
            {works.length > 0 && (
              <div>
                {works.map((m) => (
                  <SwitcherRow
                    key={m.household_id}
                    name={m.household.name}
                    active={m.household_id === household.id}
                    onClick={() => {
                      onSelect(m.household_id);
                      setOpen(false);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

function SwitcherRow({
  name,
  active,
  onClick,
}: {
  name: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onClick}
      className={`w-full text-left rounded-xl px-3 py-2.5 text-sm transition-colors truncate ${
        active ? 'bg-primary/15 font-semibold text-foreground' : 'hover:bg-muted text-foreground font-medium'
      }`}
    >
      {name}
    </button>
  );
}

export default CalendarSwitcher;
