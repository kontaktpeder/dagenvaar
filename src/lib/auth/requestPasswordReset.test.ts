import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: vi.fn(),
    },
  },
}));

vi.mock('@/lib/native/authRedirect', () => ({
  getAuthRedirectUrl: () => 'http://localhost/auth/callback',
}));

import { supabase } from '@/integrations/supabase/client';
import { requestPasswordReset } from './requestPasswordReset';

const mockReset = supabase.auth.resetPasswordForEmail as unknown as ReturnType<typeof vi.fn>;

describe('requestPasswordReset', () => {
  beforeEach(() => {
    mockReset.mockReset();
    window.sessionStorage.clear();
  });

  it('returns ok:true on success even when data is {} and error is null', async () => {
    mockReset.mockResolvedValue({ data: {}, error: null });
    const result = await requestPasswordReset('a@b.no');
    expect(result).toEqual({ ok: true });
  });

  it('ignores data payload entirely on success', async () => {
    mockReset.mockResolvedValue({ data: { anything: 'weird' }, error: null });
    const result = await requestPasswordReset('a@b.no');
    expect(result.ok).toBe(true);
  });

  it('returns normalized error when error present', async () => {
    mockReset.mockResolvedValue({ data: null, error: { message: 'Bad' } });
    const result = await requestPasswordReset('a@b.no');
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.error.message).toBe('Bad');
  });

  it('normalizes rate-limit error', async () => {
    mockReset.mockResolvedValue({ data: null, error: { status: 429 } });
    const result = await requestPasswordReset('a@b.no');
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.error.message).toContain('For mange forsøk');
  });
});
