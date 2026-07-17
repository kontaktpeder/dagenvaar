import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PopupStickyFooterProps {
  children: ReactNode;
  className?: string;
}

/**
 * Footer pinned to the bottom of a CenteredPopup.
 * Keyboard clearance is handled by CenteredPopup lifting the shell —
 * this only keeps safe-area padding so CTAs stay tappable.
 */
const PopupStickyFooter = ({ children, className }: PopupStickyFooterProps) => {
  return (
    <div
      className={cn(
        'shrink-0 bg-background border-t border-border/60 px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]',
        className,
      )}
    >
      {children}
    </div>
  );
};

export default PopupStickyFooter;
