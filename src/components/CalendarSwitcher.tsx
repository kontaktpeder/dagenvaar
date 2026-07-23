import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { calendarKindLabel } from '@/lib/calendarKinds';
import type { CalendarMembership } from '@/hooks/useCurrentHouseholdContext';
import type { Household } from '@/hooks/useHousehold';

interface CalendarSwitcherProps {
  household: Household;
  memberships: CalendarMembership[];
  onSelect: (householdId: string) => void;
}

const CalendarSwitcher = ({ household, memberships, onSelect }: CalendarSwitcherProps) => {
  const [open, setOpen] = useState(false);
  const canSwitch = memberships.length > 1;

  const homes = memberships.filter((m) => m.household.kind === 'home');
  const works = memberships.filter((m) => m.household.kind !== 'home');

  return (
    <div className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={() => canSwitch && setOpen((v) => !v)}
        className={`flex items-center gap-1.5 min-w-0 max-w-full text-left ${
          canSwitch ? 'cursor-pointer' : 'cursor-default'
        }`}
        aria-expanded={canSwitch ? open : undefined}
        aria-haspopup={canSwitch ? 'listbox' : undefined}
      >
        <span className="min-w-0">
          <span className="block text-xl font-bold tracking-tight truncate">{household.name}</span>
          <span className="block text-[11px] font-medium text-muted-foreground leading-tight">
            {calendarKindLabel(household.kind)}
          </span>
        </span>
        {canSwitch && (
          <ChevronDown
            size={18}
            strokeWidth={2.25}
            className={`shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      <AnimatePresence>
        {open && canSwitch && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 cursor-default"
              aria-label="Lukk"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-full mt-2 z-50 w-[min(100vw-2.5rem,18rem)] rounded-2xl border border-border bg-background shadow-lg p-2"
              role="listbox"
            >
              {homes.length > 0 && (
                <div className="mb-1">
                  <p className="px-2.5 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Hjem
                  </p>
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
                  <p className="px-2.5 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Jobb
                  </p>
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
            </motion.div>
          </>
        )}
      </AnimatePresence>
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
      className={`w-full text-left rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
        active ? 'bg-primary/15 text-foreground' : 'hover:bg-muted text-foreground'
      }`}
    >
      {name}
    </button>
  );
}

export default CalendarSwitcher;
