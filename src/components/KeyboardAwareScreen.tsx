import type { ReactNode, FormEventHandler } from 'react';
import { cn } from '@/lib/utils';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';

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

  const shellClass = cn(
    'min-h-[100dvh] bg-background flex flex-col max-w-lg mx-auto w-full',
    className,
  );

  const content = (
    <>
      <div
        className={cn(
          'flex-1 overflow-y-auto px-6 pt-[max(1.5rem,env(safe-area-inset-top))]',
          contentClassName,
        )}
      >
        {children}
      </div>
      {footer && (
        <div
          className="shrink-0 px-6 pt-3 border-t border-border/60 bg-background"
          style={{
            paddingBottom: `max(1.25rem, calc(env(safe-area-inset-bottom) + ${keyboardInset}px))`,
            transition: 'padding-bottom 180ms ease-out',
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
