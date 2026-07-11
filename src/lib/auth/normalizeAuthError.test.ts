import { describe, it, expect } from 'vitest';
import { normalizeAuthError } from './normalizeAuthError';

describe('normalizeAuthError', () => {
  it('returns fallback for null/undefined', () => {
    expect(normalizeAuthError(null).message).toBe('Kunne ikke sende e-post.');
    expect(normalizeAuthError(undefined).message).toBe('Kunne ikke sende e-post.');
  });

  it('returns fallback for empty object', () => {
    expect(normalizeAuthError({}).message).toBe('Kunne ikke sende e-post.');
  });

  it('uses error.message when present', () => {
    expect(normalizeAuthError({ message: 'Invalid email' }).message).toBe('Invalid email');
  });

  it('maps 429 status to rate limit message', () => {
    const r = normalizeAuthError({ status: 429, message: 'x' });
    expect(r.message).toContain('For mange forsøk');
    expect(r.status).toBe(429);
  });

  it('maps over_email_send_rate_limit code to rate limit message', () => {
    const r = normalizeAuthError({ code: 'over_email_send_rate_limit' });
    expect(r.message).toContain('For mange forsøk');
  });

  it('never returns a non-string message', () => {
    const r = normalizeAuthError({ message: '' });
    expect(typeof r.message).toBe('string');
    expect(r.message.length).toBeGreaterThan(0);
  });
});
