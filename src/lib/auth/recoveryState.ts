/**
 * Central recovery-flow state. Persisted in localStorage so it survives
 * iOS WebView reloads and cold starts during native password recovery.
 *
 * NOT for storing tokens. Only holds a boolean + timestamp indicating that
 * a password-recovery flow is currently in progress.
 */
import { logAuthDiagnostic } from './diagnostics';

const KEY = 'pastelly:recovery-state';
const TTL_MS = 10 * 60 * 1000; // 10 minutes

export type RecoveryState = {
  isRecoveryFlow: boolean;
  recoverySessionReady: boolean;
  recoveryStartedAt: number;
};

const EMPTY: RecoveryState = {
  isRecoveryFlow: false,
  recoverySessionReady: false,
  recoveryStartedAt: 0,
};

type Listener = (state: RecoveryState) => void;
const listeners = new Set<Listener>();

function safeLocal(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function readRaw(): RecoveryState {
  const store = safeLocal();
  if (!store) return { ...EMPTY };
  try {
    const raw = store.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<RecoveryState>;
    return {
      isRecoveryFlow: !!parsed.isRecoveryFlow,
      recoverySessionReady: !!parsed.recoverySessionReady,
      recoveryStartedAt: typeof parsed.recoveryStartedAt === 'number' ? parsed.recoveryStartedAt : 0,
    };
  } catch {
    return { ...EMPTY };
  }
}

function writeRaw(state: RecoveryState): void {
  const store = safeLocal();
  if (!store) return;
  try {
    if (!state.isRecoveryFlow) {
      store.removeItem(KEY);
    } else {
      store.setItem(KEY, JSON.stringify(state));
    }
  } catch {
    /* ignore */
  }
  for (const listener of listeners) listener(state);
}

export function getRecoveryState(): RecoveryState {
  const state = readRaw();
  if (state.isRecoveryFlow && state.recoveryStartedAt > 0) {
    if (Date.now() - state.recoveryStartedAt > TTL_MS) {
      writeRaw({ ...EMPTY });
      return { ...EMPTY };
    }
  }
  return state;
}

export function startRecoveryFlow(): void {
  const existing = getRecoveryState();
  if (existing.isRecoveryFlow) return;
  const next: RecoveryState = {
    isRecoveryFlow: true,
    recoverySessionReady: false,
    recoveryStartedAt: Date.now(),
  };
  writeRaw(next);
  logAuthDiagnostic('callback:received', { recovery: true });
}

export function markRecoverySessionReady(): void {
  const existing = getRecoveryState();
  if (!existing.isRecoveryFlow) {
    // Recovery event fired without prior startRecoveryFlow — start now.
    writeRaw({
      isRecoveryFlow: true,
      recoverySessionReady: true,
      recoveryStartedAt: Date.now(),
    });
    return;
  }
  writeRaw({ ...existing, recoverySessionReady: true });
}

export function clearRecoveryFlow(): void {
  writeRaw({ ...EMPTY });
  clearPendingRecoveryIntent();
}

// ---------- pendingRecoveryIntent ----------
// Set when the user requests a password-reset email. Stored in
// localStorage so it survives the native app being force-quit between
// requesting the email and opening the deep link.
const INTENT_KEY = 'pastelly:pending-recovery-intent';
const INTENT_TTL_MS = 30 * 60 * 1000; // 30 minutes

export function setPendingRecoveryIntent(): void {
  const store = safeLocal();
  if (!store) return;
  try {
    store.setItem(INTENT_KEY, JSON.stringify({ at: Date.now() }));
  } catch {
    /* ignore */
  }
}

export function hasPendingRecoveryIntent(): boolean {
  const store = safeLocal();
  if (!store) return false;
  try {
    const raw = store.getItem(INTENT_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { at?: number };
    if (typeof parsed.at !== 'number') return false;
    if (Date.now() - parsed.at > INTENT_TTL_MS) {
      store.removeItem(INTENT_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function clearPendingRecoveryIntent(): void {
  const store = safeLocal();
  if (!store) return;
  try {
    store.removeItem(INTENT_KEY);
  } catch {
    /* ignore */
  }
}

export function subscribeRecoveryState(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
