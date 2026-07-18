import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';

interface PopupStickyFooterProps {
  children: ReactNode;
  className?: string;
}

/**
 * Footer pinned to the bottom of a CenteredPopup card.
 * Safe-area lives on the overlay frame (outside the card) — do not add it here,
 * or it “floats” inside the card over the CTAs.
 */
const PopupStickyFooter = ({ children, className }: PopupStickyFooterProps) => {
  const keyboardInset = useKeyboardInset();
  const keyboardOpen = keyboardInset > 24;

  return (
    <div
      className={cn(
        'shrink-0 bg-background border-t border-border/60 px-5 pt-3',
        keyboardOpen ? 'pb-3' : 'pb-4',
        className,
      )}
    >
      {children}
    </div>
  );
};

export default PopupStickyFooter;
