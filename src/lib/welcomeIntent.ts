const KEY = 'pastelly:welcome-intent';

export type WelcomeIntent = 'create' | 'join';

type StoredWelcome = {
  intent: WelcomeIntent;
  householdId: string;
};

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function readStored(): StoredWelcome | null {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(KEY);
    if (!raw) return null;
    // Legacy: bare "create" | "join" uten household-scope
    if (raw === 'create' || raw === 'join') {
      return { intent: raw, householdId: '' };
    }
    const parsed = JSON.parse(raw) as Partial<StoredWelcome>;
    if (
      (parsed.intent === 'create' || parsed.intent === 'join') &&
      typeof parsed.householdId === 'string'
    ) {
      return { intent: parsed.intent, householdId: parsed.householdId };
    }
    return null;
  } catch {
    return null;
  }
}

export function setWelcomeIntent(intent: WelcomeIntent, householdId: string): void {
  const s = storage();
  if (!s || !householdId) return;
  try {
    const payload: StoredWelcome = { intent, householdId };
    s.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

/** Peek pending welcome for this household (or any if householdId omitted). */
export function peekWelcomeIntent(householdId?: string): WelcomeIntent | null {
  const stored = readStored();
  if (!stored) return null;
  if (householdId && stored.householdId && stored.householdId !== householdId) {
    return null;
  }
  return stored.intent;
}

export function consumeWelcomeIntent(householdId?: string): WelcomeIntent | null {
  const s = storage();
  if (!s) return null;
  const stored = readStored();
  if (!stored) return null;
  if (householdId && stored.householdId && stored.householdId !== householdId) {
    return null;
  }
  try {
    s.removeItem(KEY);
  } catch {
    /* ignore */
  }
  return stored.intent;
}
