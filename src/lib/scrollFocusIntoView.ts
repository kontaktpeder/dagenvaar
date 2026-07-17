/**
 * Scroll the focused field into view inside its nearest scroll container only.
 * Avoids scrolling the page/calendar (double-slide with keyboard).
 */
export function scrollFocusIntoView(e: React.FocusEvent<HTMLElement>) {
  const el = e.currentTarget;
  window.setTimeout(() => {
    try {
      const parent = findScrollParent(el);
      if (!parent) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        return;
      }

      const parentRect = parent.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      // Leave room for sticky footer (~88px) above keyboard inside the card
      const footerReserve = 96;
      const topPad = 12;
      const visibleBottom = parentRect.bottom - footerReserve;

      if (elRect.top < parentRect.top + topPad) {
        parent.scrollTop -= parentRect.top + topPad - elRect.top;
      } else if (elRect.bottom > visibleBottom) {
        parent.scrollTop += elRect.bottom - visibleBottom;
      }
    } catch {
      /* older browsers */
    }
  }, 120);
}

function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node) {
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    if (
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
      node.scrollHeight > node.clientHeight
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}
