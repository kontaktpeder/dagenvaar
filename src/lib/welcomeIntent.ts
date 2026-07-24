const KEY = 'pastelly:welcome-intent';

export type WelcomeIntent = 'create' | 'join';

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function setWelcomeIntent(intent: WelcomeIntent): void {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(KEY, intent);
  } catch {
    /* ignore */
  }
}

export function peekWelcomeIntent(): WelcomeIntent | null {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(KEY);
    if (raw === 'create' || raw === 'join') return raw;
    return null;
  } catch {
    return null;
  }
}

export function consumeWelcomeIntent(): WelcomeIntent | null {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(KEY);
    s.removeItem(KEY);
    if (raw === 'create' || raw === 'join') return raw;
    return null;
  } catch {
    return null;
  }
}
