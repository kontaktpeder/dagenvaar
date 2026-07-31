import { describe, expect, it } from 'vitest';
import { classifySessionUserError } from './sessionValidity';

describe('classifySessionUserError', () => {
  it('treats no error as valid', () => {
    expect(classifySessionUserError(null)).toBe('valid');
  });

  it('treats auth rejections as gone', () => {
    expect(classifySessionUserError({ status: 401, message: 'invalid claim' })).toBe('gone');
    expect(classifySessionUserError({ status: 403 })).toBe('gone');
    expect(classifySessionUserError({ status: 404, message: 'User not found' })).toBe('gone');
  });

  it('keeps network and server failures unknown', () => {
    expect(classifySessionUserError({ name: 'AuthRetryableFetchError' })).toBe('unknown');
    expect(classifySessionUserError({ name: 'TypeError', message: 'Failed to fetch' })).toBe('unknown');
    expect(classifySessionUserError({ status: 500 })).toBe('unknown');
    expect(classifySessionUserError({ status: 503 })).toBe('unknown');
    expect(classifySessionUserError({ message: 'offline' })).toBe('unknown');
  });

  it('maps user-not-found messages with other statuses to gone', () => {
    expect(classifySessionUserError({ status: 400, message: 'user_not_found' })).toBe('gone');
  });
});
