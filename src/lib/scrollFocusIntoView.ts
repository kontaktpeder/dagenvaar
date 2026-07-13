/**
 * Handler for input/textarea focus that scrolls the field into view on
 * mobile keyboards (iOS Capacitor). Uses a small delay so the keyboard
 * has begun animating before the scroll target is computed.
 */
export function scrollFocusIntoView(e: React.FocusEvent<HTMLElement>) {
  const el = e.currentTarget;
  window.setTimeout(() => {
    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch {
      /* older browsers */
    }
  }, 250);
}
