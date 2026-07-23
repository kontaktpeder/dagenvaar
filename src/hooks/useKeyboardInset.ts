import { useEffect, useState } from 'react';
import { Keyboard } from '@capacitor/keyboard';
import { isNativePlatform } from '@/lib/native/platform';

/**
 * Returns the current keyboard overlap in px so sticky CTAs can sit above it.
 * Uses Capacitor Keyboard on native; visualViewport on web / as fallback.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const handles: { remove: () => Promise<void> }[] = [];
    let focusOutTimerA = 0;
    let focusOutTimerB = 0;

    const setSafe = (value: number) => {
      const next = Math.max(0, Math.round(value));
      if (!cancelled) {
        setInset(next);
        document.documentElement.style.setProperty('--keyboard-inset', `${next}px`);
      }
    };

    const fromVisualViewport = () => {
      const vv = window.visualViewport;
      if (!vv) return 0;
      // Ignore tiny gaps (browser chrome); treat near-full viewport as closed.
      const overlap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      return overlap < 48 ? 0 : overlap;
    };

    const syncViewport = () => setSafe(fromVisualViewport());

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', syncViewport);
      vv.addEventListener('scroll', syncViewport);
    }
    window.addEventListener('resize', syncViewport);

    const onFocusOut = () => {
      // iOS PWA sometimes leaves a stale offset after blur; re-sync twice.
      window.clearTimeout(focusOutTimerA);
      window.clearTimeout(focusOutTimerB);
      focusOutTimerA = window.setTimeout(syncViewport, 120);
      focusOutTimerB = window.setTimeout(syncViewport, 320);
    };

    if (isNativePlatform()) {
      void Keyboard.addListener('keyboardWillShow', (info) => {
        // Prefer Capacitor height on native — more stable than visualViewport during animation.
        setSafe(info.keyboardHeight || fromVisualViewport());
      }).then((h) => {
        if (!cancelled) handles.push(h);
        else void h.remove();
      });
      void Keyboard.addListener('keyboardDidShow', (info) => {
        setSafe(info.keyboardHeight || fromVisualViewport());
      }).then((h) => {
        if (!cancelled) handles.push(h);
        else void h.remove();
      });
      void Keyboard.addListener('keyboardWillHide', () => {
        setSafe(0);
      }).then((h) => {
        if (!cancelled) handles.push(h);
        else void h.remove();
      });
      void Keyboard.addListener('keyboardDidHide', () => {
        setSafe(0);
      }).then((h) => {
        if (!cancelled) handles.push(h);
        else void h.remove();
      });
    } else {
      syncViewport();
      document.addEventListener('focusout', onFocusOut);
    }

    return () => {
      cancelled = true;
      document.documentElement.style.setProperty('--keyboard-inset', '0px');
      vv?.removeEventListener('resize', syncViewport);
      vv?.removeEventListener('scroll', syncViewport);
      window.removeEventListener('resize', syncViewport);
      document.removeEventListener('focusout', onFocusOut);
      window.clearTimeout(focusOutTimerA);
      window.clearTimeout(focusOutTimerB);
      handles.forEach((h) => void h.remove());
    };
  }, []);

  return inset;
}
