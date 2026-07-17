import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { nb } from 'date-fns/locale';
import { useEventComments, useAddComment, useDeleteEvent, type Event } from '@/hooks/useEvents';
import { DAY_PART_LABELS, getMemberColor } from '@/lib/colors';
import { EVENT_CATEGORY_META } from '@/lib/eventCategories';
import { resolveCategoryVisuals, resolveCategoryLabel, getMemberColorMap } from '@/lib/categoryPresentation';
import type { HouseholdMember } from '@/hooks/useHousehold';
import CenteredPopup from '@/components/CenteredPopup';

interface EventDetailSheetProps {
  event: Event;
  members: HouseholdMember[];
  currentMemberId: string;
  onClose: () => void;
  onEdit?: (event: Event) => void;
  onQuickEdit?: (event: Event) => void;
}

const EventDetailSheet = ({ event, members, currentMemberId, onClose, onEdit, onQuickEdit }: EventDetailSheetProps) => {
  const [comment, setComment] = useState('');
  const { data: comments = [] } = useEventComments(event.id);
  const addComment = useAddComment();
  const deleteEvent = useDeleteEvent();

  const owner = members.find((m) => m.id === event.owner_member_id);
  const ownerColor = owner ? getMemberColor(owner.color_token) : getMemberColor('pastel-blue');

  const handleAddComment = () => {
    if (!comment.trim()) return;
    addComment.mutate({
      event_id: event.id,
      sender_member_id: currentMemberId,
      body: comment.trim(),
    });
    setComment('');
  };

  const handleDelete = async () => {
    await deleteEvent.mutateAsync(event.id);
    onClose();
  };

  const getMemberById = (id: string) => members.find((m) => m.id === id);

  return (
    <CenteredPopup onClose={onClose} size="card" zClassName="z-[60]">
      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-6 min-h-0">
        {/* Event header */}
        <div className={`rounded-2xl p-5 mb-4 ${ownerColor.bg}`}>
          <h2 className="text-xl font-bold mb-1">{event.title}</h2>
          <p className="text-sm text-muted-foreground">
            {owner?.display_name} · {format(new Date(event.event_date + 'T12:00:00'), 'd. MMMM yyyy', { locale: nb })}
            {(event as any).end_date && (event as any).end_date !== event.event_date && (
              <> → {format(new Date((event as any).end_date + 'T12:00:00'), 'd. MMMM yyyy', { locale: nb })}</>
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            {(() => {
              const dps = (event as any).day_part_start;
              const dpe = (event as any).day_part_end;
              if (dps && dpe && dps !== dpe) {
                return `${DAY_PART_LABELS[dps] || dps} – ${DAY_PART_LABELS[dpe] || dpe}`;
              }
              if (dps === 'full_diem') return 'Hele døgnet';
              if (dps === 'all_day') return 'Hele dagen';
              return DAY_PART_LABELS[event.day_part] || event.day_part;
            })()}
            {event.start_time && ` · ${event.start_time.slice(0, 5)}`}
            {event.end_time && `–${event.end_time.slice(0, 5)}`}
          </p>
          {event.location && <p className="text-sm mt-2">📍 {event.location}</p>}
          {event.notes && <p className="text-sm mt-2 text-muted-foreground">{event.notes}</p>}
          {(() => {
            const meta = EVENT_CATEGORY_META[(event.category as keyof typeof EVENT_CATEGORY_META) || 'other'];
            const visuals = resolveCategoryVisuals(event.category, getMemberColorMap(owner));
            const label = resolveCategoryLabel(event.category, (event as any).category_label_override);
            const Icon = meta?.Icon;
            return (
              <div className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-medium ${visuals.softBg}`}>
                {Icon && <Icon size={12} className={visuals.iconColor} />}
                {label}
              </div>
            );
          })()}
        </div>

        {/* Comments */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Kommentarer</h3>
          {comments.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Ingen kommentarer ennå
            </p>
          )}
          <div className="space-y-3">
            {comments.map((c) => {
              const sender = getMemberById(c.sender_member_id);
              const senderColor = sender ? getMemberColor(sender.color_token) : getMemberColor('pastel-blue');
              return (
                <div key={c.id} className="flex gap-3">
                  <div className={`w-8 h-8 rounded-full ${senderColor.bg} flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                    {sender?.display_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{sender?.display_name || 'Ukjent'}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(c.created_at), { locale: nb, addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm">{c.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Add comment */}
        <div className="flex gap-2 mb-4">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
            placeholder="Skriv en kommentar..."
            className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={handleAddComment}
            disabled={!comment.trim()}
            className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            Send
          </button>
        </div>

        {event.owner_member_id === currentMemberId && onQuickEdit && (
          <button
            onClick={() => onQuickEdit(event)}
            className="w-full rounded-xl bg-primary/15 hover:bg-primary/25 py-3 text-sm text-primary font-semibold transition-colors mb-2"
          >
            Endre hendelse
          </button>
        )}

        {event.owner_member_id === currentMemberId && (
          <button
            onClick={handleDelete}
            className="w-full rounded-xl border border-destructive/30 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            Slett hendelse
          </button>
        )}
      </div>
    </CenteredPopup>
  );
};

export default EventDetailSheet;
