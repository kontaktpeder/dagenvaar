/**
 * Central recovery-flow state. Persisted in sessionStorage so it survives
 * WebView reloads (native cold-launch → deep link → potential reload) and
 * component unmount/remount during the recovery flow.
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

function safeSession(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

function readRaw(): RecoveryState {
  const store = safeSession();
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
  const store = safeSession();
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
}

export function subscribeRecoveryState(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
