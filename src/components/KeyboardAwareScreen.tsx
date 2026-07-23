import { useEffect, useRef, type ReactNode, type FormEventHandler } from 'react';
import { cn } from '@/lib/utils';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';
import { KEYBOARD_PAD_TRANSITION } from '@/lib/motion';

interface KeyboardAwareScreenProps {
  children: ReactNode;
  /** Sticky bottom CTA area */
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  asForm?: boolean;
}

/**
 * Full-screen writing layout: scrollable content + sticky footer that lifts with the keyboard.
 * Bounded to the viewport so iOS PWA keyboard open/close doesn't leave the page scrolled away.
 */
const KeyboardAwareScreen = ({
  children,
  footer,
  className,
  contentClassName,
  onSubmit,
  asForm = false,
}: KeyboardAwareScreenProps) => {
  const keyboardInset = useKeyboardInset();
  const keyboardOpen = keyboardInset > 24;
  const scrollRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);

  // After keyboard dismiss: reset inner scroll + window scroll (iOS home-screen PWA).
  useEffect(() => {
    if (keyboardOpen) {
      wasOpenRef.current = true;
      return;
    }
    if (!wasOpenRef.current) return;
    wasOpenRef.current = false;

    const el = scrollRef.current;
    if (el) el.scrollTop = 0;
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' in window ? 'instant' : 'auto' } as ScrollToOptions);
    } catch {
      window.scrollTo(0, 0);
    }
  }, [keyboardOpen]);

  const shellClass = cn(
    'h-[100dvh] max-h-[100dvh] overflow-hidden bg-background flex flex-col max-w-lg mx-auto w-full',
    className,
  );

  const content = (
    <>
      <div
        ref={scrollRef}
        className={cn(
          'flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-touch px-6 pt-[max(1.5rem,env(safe-area-inset-top))]',
          contentClassName,
          // Drop vertical centering while typing — avoids stuck offset after dismiss.
          keyboardOpen && 'justify-start',
        )}
      >
        {children}
      </div>
      {footer && (
        <div
          className="shrink-0 px-6 pt-3 border-t border-border/60 bg-background"
          style={{
            paddingBottom: `max(1.25rem, calc(env(safe-area-inset-bottom) + ${keyboardInset}px))`,
            transition: KEYBOARD_PAD_TRANSITION,
          }}
        >
          {footer}
        </div>
      )}
    </>
  );

  if (asForm) {
    return (
      <form onSubmit={onSubmit} className={shellClass}>
        {content}
      </form>
    );
  }

  return <div className={shellClass}>{content}</div>;
};

export default KeyboardAwareScreen;
