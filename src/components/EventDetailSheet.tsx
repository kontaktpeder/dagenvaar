import { useState } from 'react';
import { motion } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import { nb } from 'date-fns/locale';
import { useEventComments, useAddComment, useDeleteEvent, type Event } from '@/hooks/useEvents';
import { DAY_PART_LABELS, getMemberColor } from '@/lib/colors';
import type { HouseholdMember } from '@/hooks/useHousehold';

interface EventDetailSheetProps {
  event: Event;
  members: HouseholdMember[];
  currentMemberId: string;
  onClose: () => void;
}

const EventDetailSheet = ({ event, members, currentMemberId, onClose }: EventDetailSheetProps) => {
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-foreground/20" onClick={onClose} />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="relative mt-auto bg-background rounded-t-3xl max-h-[85vh] flex flex-col"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-8">
          {/* Event header */}
          <div className={`rounded-2xl p-5 mb-4 ${ownerColor.bg}`}>
            <h2 className="text-xl font-bold mb-1">{event.title}</h2>
            <p className="text-sm text-muted-foreground">
              {owner?.display_name} · {format(new Date(event.event_date + 'T12:00:00'), 'd. MMMM yyyy', { locale: nb })}
            </p>
            <p className="text-sm text-muted-foreground">
              {DAY_PART_LABELS[event.day_part] || event.day_part}
              {event.start_time && ` · ${event.start_time.slice(0, 5)}`}
              {event.end_time && `–${event.end_time.slice(0, 5)}`}
            </p>
            {event.location && <p className="text-sm mt-2">📍 {event.location}</p>}
            {event.notes && <p className="text-sm mt-2 text-muted-foreground">{event.notes}</p>}
          </div>

          {/* Comments */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Kommentarer</h3>
            {comments.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Ingen kommentarer ennå 💬
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

          {/* Delete */}
          {event.owner_member_id === currentMemberId && (
            <button
              onClick={handleDelete}
              className="w-full rounded-xl border border-destructive/30 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              Slett hendelse
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default EventDetailSheet;
