import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLocale } from '@/hooks/useLocale';
import { burstConfetti } from '@/lib/celebrate';
import {
  buildInviteShareText,
  buildInviteUrl,
  normalizeInviteCode,
} from '@/lib/inviteLink';
import type { WelcomeIntent } from '@/lib/welcomeIntent';

interface WelcomeDialogProps {
  intent: WelcomeIntent;
  householdId?: string;
  onClose: () => void;
}

type InviteRow = {
  code: string;
  expires_at: string;
};

/** Centered welcome after onboarding / seed — invite is one tap for creators. */
const WelcomeDialog = ({ intent, householdId, onClose }: WelcomeDialogProps) => {
  const { t, intlLocale } = useLocale();
  const [invite, setInvite] = useState<InviteRow | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState('');

  useEffect(() => {
    const id = window.setTimeout(() => burstConfetti(), 120);
    return () => window.clearTimeout(id);
  }, []);

  const shareTextFor = (code: string) =>
    buildInviteShareText(code, {
      greeting: t('welcome.inviteShareGreeting'),
      codeLabel: t('welcome.inviteShareCodeLabel'),
      linkHint: t('welcome.inviteShareLinkHint'),
    });

  /** Clipboard gets only AB12-CD34 — not the full share message. */
  const copyCodeOnly = async (code: string) => {
    await navigator.clipboard.writeText(normalizeInviteCode(code));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  };

  const createInvite = useMutation({
    mutationFn: async () => {
      if (!householdId) throw new Error(t('common.error'));
      const { data, error } = await supabase.rpc('create_household_invite', {
        p_household_id: householdId,
      });
      if (error) throw error;
      const row = data?.[0];
      if (!row?.code) throw new Error(t('common.error'));
      return { code: row.code as string, expires_at: row.expires_at as string };
    },
    onSuccess: (data) => {
      setInvite(data);
      setShareError('');
      // Copy short code first — before any share sheet covers the app.
      void copyCodeOnly(data.code).catch(() => {
        /* clipboard may be blocked; user can tap Kopier kode */
      });
    },
    onError: (err: any) => {
      setShareError(err?.message || t('common.error'));
    },
  });

  const handleShare = async (code: string) => {
    const text = shareTextFor(code);
    try {
      if (navigator.share) {
        // Full invite message; URL is already inside text (cleaner on iOS Messages).
        await navigator.share({ text, title: 'Pastelly' });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2500);
      } catch {
        setShareError(t('common.error'));
      }
    }
  };

  const handleCreateClick = () => {
    if (invite) return;
    createInvite.mutate();
  };

  const isCreate = intent === 'create';
  const title = isCreate ? t('welcome.createTitle') : t('welcome.joinTitle');
  const body = isCreate ? t('welcome.createBody') : t('welcome.joinBody');

  return (
    <motion.div
      className="fixed inset-0 z-[90] flex items-center justify-center px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <button
        type="button"
        aria-label={t('common.close')}
        className="absolute inset-0 bg-foreground/40"
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: 'tween', duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
        className="relative w-full max-w-sm rounded-[1.75rem] bg-background p-6 pt-7 text-center shadow-soft-lg"
      >
        <p className="text-4xl mb-3" aria-hidden>
          {isCreate ? '✨' : '👋'}
        </p>
        <h2 id="welcome-title" className="text-2xl font-bold tracking-tight mb-2">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-5">{body}</p>

        {invite && (
          <div className="mb-4 rounded-2xl bg-muted/60 px-4 py-3">
            <p className="text-xs text-muted-foreground mb-1">{t('profile.inviteCode')}</p>
            <p className="text-2xl font-bold tracking-widest select-all">{invite.code}</p>
            {invite.expires_at && (
              <p className="text-[11px] text-muted-foreground mt-1">
                {new Date(invite.expires_at).toLocaleDateString(intlLocale)}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground mt-2 break-all">
              {buildInviteUrl(invite.code)}
            </p>
            {copied && (
              <p className="text-xs font-medium text-green-800 mt-2">{t('welcome.inviteCopiedHint')}</p>
            )}
          </div>
        )}

        {shareError && (
          <p className="text-destructive text-sm mb-3">{shareError}</p>
        )}

        {isCreate ? (
          <div className="space-y-2">
            {!invite ? (
              <button
                type="button"
                disabled={createInvite.isPending}
                onClick={handleCreateClick}
                className="w-full rounded-2xl bg-green-200 text-green-900 py-3.5 font-semibold hover:bg-green-300 transition-colors disabled:opacity-50"
              >
                {createInvite.isPending ? t('welcome.inviteCreating') : t('welcome.inviteCta')}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void copyCodeOnly(invite.code).catch(() => setShareError(t('common.error')))}
                  className="w-full rounded-2xl bg-green-200 text-green-900 py-3.5 font-semibold hover:bg-green-300 transition-colors"
                >
                  {copied ? t('profile.copied') : t('welcome.copyCode')}
                </button>
                <button
                  type="button"
                  onClick={() => void handleShare(invite.code)}
                  className="w-full rounded-2xl bg-muted py-3 font-semibold text-foreground hover:bg-muted/80 transition-colors"
                >
                  {t('welcome.shareCode')}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-sm font-medium text-muted-foreground underline underline-offset-2"
            >
              {t('welcome.later')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl bg-green-200 text-green-900 py-3.5 font-semibold hover:bg-green-300 transition-colors"
          >
            {t('welcome.cta')}
          </button>
        )}
      </motion.div>
    </motion.div>
  );
};

export default WelcomeDialog;
