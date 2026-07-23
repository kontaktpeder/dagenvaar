import { Capacitor } from '@capacitor/core';

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export function isIOS(): boolean {
  return Capacitor.getPlatform() === 'ios';
}

export function isAndroid(): boolean {
  return Capacitor.getPlatform() === 'android';
}

/** Native Android app or Android browser / PWA (Denis may use Chrome). */
export function isAndroidLike(): boolean {
  if (isAndroid()) return true;
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

export function isWeb(): boolean {
  return Capacitor.getPlatform() === 'web';
}

/** Coarse pointer (finger) — useful for gesture thresholds. */
export function isCoarsePointer(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(pointer: coarse)').matches;
}
