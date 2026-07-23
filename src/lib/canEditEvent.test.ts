import { describe, expect, it } from 'vitest';
import { canEditEvent } from '@/lib/canEditEvent';

describe('canEditEvent', () => {
  it('allows owner always', () => {
    expect(
      canEditEvent(
        { owner_member_id: 'a', visibility_type: 'private' },
        'a',
        'work',
      ),
    ).toBe(true);
  });

  it('allows home members to edit shared events', () => {
    expect(
      canEditEvent(
        { owner_member_id: 'a', visibility_type: 'all_members' },
        'b',
        'home',
      ),
    ).toBe(true);
  });

  it('blocks home members from editing private events', () => {
    expect(
      canEditEvent(
        { owner_member_id: 'a', visibility_type: 'private' },
        'b',
        'home',
      ),
    ).toBe(false);
  });

  it('blocks work members from editing others events', () => {
    expect(
      canEditEvent(
        { owner_member_id: 'a', visibility_type: 'all_members' },
        'b',
        'work',
      ),
    ).toBe(false);
  });
});
