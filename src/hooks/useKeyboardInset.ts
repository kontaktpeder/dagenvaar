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

    const setSafe = (value: number) => {
      if (!cancelled) setInset(Math.max(0, Math.round(value)));
    };

    const fromVisualViewport = () => {
      const vv = window.visualViewport;
      if (!vv) return 0;
      return Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    };

    const syncViewport = () => setSafe(fromVisualViewport());

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', syncViewport);
      vv.addEventListener('scroll', syncViewport);
    }
    window.addEventListener('resize', syncViewport);

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
    }

    return () => {
      cancelled = true;
      vv?.removeEventListener('resize', syncViewport);
      vv?.removeEventListener('scroll', syncViewport);
      window.removeEventListener('resize', syncViewport);
      handles.forEach((h) => void h.remove());
    };
  }, []);

  return inset;
}
