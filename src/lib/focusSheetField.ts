import { Keyboard } from '@capacitor/keyboard';
import { isNativePlatform } from '@/lib/native/platform';
import { scrollElementIntoContainer } from '@/lib/scrollFocusIntoView';

/**
 * Focus a sheet field as early as possible (prefer useLayoutEffect) so iOS
 * still treats it as part of the open tap and shows the keyboard.
 * On native, also ask Capacitor to show the keyboard.
 */
export function focusSheetField(el: HTMLElement | null, opts?: { footerReserve?: number }) {
  if (!el) return;
  try {
    el.focus({ preventScroll: true });
  } catch {
    el.focus();
  }

  if (isNativePlatform()) {
    void Keyboard.show().catch(() => {
      /* webview may ignore if not editable-focused yet */
    });
  }

  const reserve = opts?.footerReserve ?? 128;
  window.requestAnimationFrame(() => {
    scrollElementIntoContainer(el, { footerReserve: reserve });
  });
  window.setTimeout(() => scrollElementIntoContainer(el, { footerReserve: reserve }), 200);
}

/** Blur + hide keyboard so sheet drag isn't gated by a focused field. */
export function blurSheetField() {
  const ae = document.activeElement;
  if (ae instanceof HTMLElement) ae.blur();
  if (isNativePlatform()) {
    void Keyboard.hide().catch(() => {
      /* ignore */
    });
  }
}
