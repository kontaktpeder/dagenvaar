import { supabase } from '@/integrations/supabase/client';

export type PartnerNotifyKind =
  | 'event_created'
  | 'event_updated'
  | 'comment_added'
  | 'countdown_invite'
  | 'countdown_joined';

/**
 * Ask the backend to push household member(s).
 * Fire-and-forget — never blocks the UI.
 */
export function notifyPartners(input: {
  householdId: string;
  kind: PartnerNotifyKind;
  title: string;
  body: string;
  eventId?: string;
  countdownId?: string;
  targetUserIds?: string[];
  date?: string;
}): void {
  void supabase.functions
    .invoke('notify-partners', {
      body: {
        household_id: input.householdId,
        kind: input.kind,
        title: input.title,
        body: input.body,
        event_id: input.eventId ?? null,
        countdown_id: input.countdownId ?? null,
        target_user_ids: input.targetUserIds ?? null,
        date: input.date ?? null,
      },
    })
    .then(({ error }) => {
      if (error) console.warn('[push] notify-partners failed', error.message);
    })
    .catch((err) => {
      console.warn('[push] notify-partners failed', err);
    });
}
