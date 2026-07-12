import { describe, it, expect, beforeEach, vi } from 'vitest';

type Handler = (event: string) => void;
const handlers: Handler[] = [];
const onAuthStateChangeMock = vi.fn((cb: Handler) => {
  handlers.push(cb);
  return { data: { subscription: { unsubscribe: vi.fn() } } };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (cb: Handler) => onAuthStateChangeMock(cb),
    },
  },
}));

describe('installGlobalRecoveryListener', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    handlers.length = 0;
    onAuthStateChangeMock.mockClear();
    vi.resetModules();
  });

  it('marks recovery flow ready when PASSWORD_RECOVERY fires', async () => {
    const { installGlobalRecoveryListener } = await import('./globalRecoveryListener');
    installGlobalRecoveryListener();
    expect(onAuthStateChangeMock).toHaveBeenCalledTimes(1);
    handlers[0]('PASSWORD_RECOVERY');
    const raw = window.sessionStorage.getItem('pastelly:recovery-state');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.isRecoveryFlow).toBe(true);
    expect(parsed.recoverySessionReady).toBe(true);
  });

  it('ignores non-recovery events', async () => {
    const { installGlobalRecoveryListener } = await import('./globalRecoveryListener');
    installGlobalRecoveryListener();
    handlers[0]('SIGNED_IN');
    handlers[0]('TOKEN_REFRESHED');
    expect(window.sessionStorage.getItem('pastelly:recovery-state')).toBeNull();
  });

  it('is idempotent — only installs once', async () => {
    const { installGlobalRecoveryListener } = await import('./globalRecoveryListener');
    installGlobalRecoveryListener();
    installGlobalRecoveryListener();
    installGlobalRecoveryListener();
    expect(onAuthStateChangeMock).toHaveBeenCalledTimes(1);
  });
});
