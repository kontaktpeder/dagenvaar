import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useKeyboardInset } from '@/hooks/useKeyboardInset';

interface PopupStickyFooterProps {
  children: ReactNode;
  className?: string;
}

/**
 * Footer that stays pinned to the bottom of a CenteredPopup and lifts
 * only itself above the keyboard — the popup shell stays put.
 */
const PopupStickyFooter = ({ children, className }: PopupStickyFooterProps) => {
  const keyboardInset = useKeyboardInset();

  return (
    <div
      className={cn('shrink-0 bg-background', className)}
      style={{
        paddingBottom: `max(1.25rem, calc(env(safe-area-inset-bottom) + ${keyboardInset}px))`,
        transition: 'padding-bottom 160ms ease-out',
      }}
    >
      {children}
    </div>
  );
};

export default PopupStickyFooter;
