import { useEffect, useState } from 'react';
import { Keyboard } from '@capacitor/keyboard';
import { isNativePlatform } from '@/lib/native/platform';

const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable="true"]';

export function isEditableFocused(): boolean {
  const ae = document.activeElement;
  if (!ae || ae === document.body) return false;
  if (!(ae instanceof HTMLElement)) return false;
  return ae.matches(EDITABLE_SELECTOR);
}

/**
 * Returns the current keyboard overlap in px so sticky CTAs can sit above it.
 * Uses Capacitor Keyboard on native; visualViewport on web / as fallback.
 *
 * With Keyboard.resize: 'none', visualViewport often stays full-height while the
 * keyboard is open — Capacitor events own the inset. Hide events can miss on iOS,
 * so we also clear when focus leaves editable fields.
 *
 * A positive inset is only reported while an editable field is focused. That
 * prevents sticky footers from floating mid-sheet after a stale native hide.
 */
export function useKeyboardInset(): number {
  const [rawInset, setRawInset] = useState(0);
  const [editableFocused, setEditableFocused] = useState(() =>
    typeof document !== 'undefined' ? isEditableFocused() : false,
  );

  useEffect(() => {
    let cancelled = false;
    const handles: { remove: () => Promise<void> }[] = [];
    let focusOutTimerA = 0;
    let focusOutTimerB = 0;
    let showReconcileTimer = 0;
    const native = isNativePlatform();

    const setRaw = (value: number) => {
      const next = Math.max(0, Math.round(value));
      if (!cancelled) setRawInset(next);
    };

    const syncFocus = () => {
      if (cancelled) return;
      const focused = isEditableFocused();
      setEditableFocused(focused);
      if (!focused) setRaw(0);
    };

    const fromVisualViewport = () => {
      const vv = window.visualViewport;
      if (!vv) return 0;
      // Ignore tiny gaps (browser chrome); treat near-full viewport as closed.
      const overlap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      return overlap < 48 ? 0 : overlap;
    };

    const syncViewport = () => {
      if (native) {
        // Capacitor owns the inset; vv often stays full-height with resize:none.
        if (!isEditableFocused()) {
          setRaw(0);
          setEditableFocused(false);
        }
        return;
      }
      if (!isEditableFocused()) {
        setRaw(0);
        setEditableFocused(false);
        return;
      }
      setRaw(fromVisualViewport());
      setEditableFocused(true);
    };

    /** Clear stale inset when nothing editable is focused (native hide can miss). */
    const clearIfBlurred = () => {
      syncFocus();
      if (isEditableFocused() && !native) syncViewport();
    };

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', syncViewport);
      vv.addEventListener('scroll', syncViewport);
    }
    window.addEventListener('resize', syncViewport);

    const onFocusIn = () => {
      window.clearTimeout(focusOutTimerA);
      window.clearTimeout(focusOutTimerB);
      syncFocus();
      // Web: measure overlap now that a field is focused.
      if (!native && isEditableFocused()) syncViewport();
    };

    const onFocusOut = () => {
      window.clearTimeout(focusOutTimerA);
      window.clearTimeout(focusOutTimerB);
      // After blur, activeElement may still be the field for a tick — recheck twice.
      focusOutTimerA = window.setTimeout(clearIfBlurred, 120);
      focusOutTimerB = window.setTimeout(clearIfBlurred, 360);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        setRaw(0);
        setEditableFocused(false);
      } else {
        syncFocus();
      }
    };

    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    document.addEventListener('visibilitychange', onVisibility);

    const applyNativeShow = (info: { keyboardHeight?: number }) => {
      const height = info.keyboardHeight || fromVisualViewport();
      if (!isEditableFocused()) {
        // Show can race ahead of focus; keep inset only if focus lands shortly.
        window.clearTimeout(showReconcileTimer);
        showReconcileTimer = window.setTimeout(() => {
          if (!isEditableFocused()) {
            setRaw(0);
            setEditableFocused(false);
          } else {
            setRaw(height);
            setEditableFocused(true);
          }
        }, 80);
        return;
      }
      setRaw(height);
      setEditableFocused(true);
    };

    if (native) {
      void Keyboard.addListener('keyboardWillShow', applyNativeShow).then((h) => {
        if (!cancelled) handles.push(h);
        else void h.remove();
      });
      void Keyboard.addListener('keyboardDidShow', applyNativeShow).then((h) => {
        if (!cancelled) handles.push(h);
        else void h.remove();
      });
      void Keyboard.addListener('keyboardWillHide', () => {
        setRaw(0);
      }).then((h) => {
        if (!cancelled) handles.push(h);
        else void h.remove();
      });
      void Keyboard.addListener('keyboardDidHide', () => {
        setRaw(0);
      }).then((h) => {
        if (!cancelled) handles.push(h);
        else void h.remove();
      });
    } else {
      syncViewport();
    }

    return () => {
      cancelled = true;
      document.documentElement.style.setProperty('--keyboard-inset', '0px');
      vv?.removeEventListener('resize', syncViewport);
      vv?.removeEventListener('scroll', syncViewport);
      window.removeEventListener('resize', syncViewport);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearTimeout(focusOutTimerA);
      window.clearTimeout(focusOutTimerB);
      window.clearTimeout(showReconcileTimer);
      handles.forEach((h) => void h.remove());
    };
  }, []);

  // Mirror effective value to CSS for any non-React readers.
  useEffect(() => {
    const effective = editableFocused ? rawInset : 0;
    document.documentElement.style.setProperty('--keyboard-inset', `${effective}px`);
  }, [editableFocused, rawInset]);

  return editableFocused ? rawInset : 0;
}
