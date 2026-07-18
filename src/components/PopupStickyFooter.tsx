import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';

interface PopupStickyFooterProps {
  children: ReactNode;
  className?: string;
}

/**
 * Footer pinned to the bottom of a CenteredPopup.
 * When keyboard is open the shell already lifts — drop home-indicator pad to avoid double gap.
 */
const PopupStickyFooter = ({ children, className }: PopupStickyFooterProps) => {
  const keyboardInset = useKeyboardInset();
  const keyboardOpen = keyboardInset > 24;

  return (
    <div
      className={cn(
        'shrink-0 bg-background border-t border-border/60 px-5 pt-3',
        keyboardOpen ? 'pb-3' : 'pb-[max(1.25rem,env(safe-area-inset-bottom))]',
        className,
      )}
    >
      {children}
    </div>
  );
};

export default PopupStickyFooter;
