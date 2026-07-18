import type { Transition, Variants } from 'framer-motion';

/** Snappy page / month strip spring — iOS-like settle */
export const snapSpring: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 42,
  mass: 0.75,
};

/** Modal / sheet card enter — no opacity; tiny slide only */
export const sheetSpring: Transition = {
  type: 'tween',
  duration: 0.2,
  ease: [0.32, 0.72, 0, 1],
};

/** Wizard step push/pop — no opacity fade (avoids blank flash with mode=wait) */
export const stepSpring: Transition = {
  type: 'tween',
  duration: 0.2,
  ease: [0.32, 0.72, 0, 1],
};

export const fadeQuick: Transition = {
  duration: 0.15,
  ease: [0.32, 0.72, 0, 1],
};

export const stepForward = {
  initial: { x: 20 },
  animate: { x: 0 },
  exit: { x: -16 },
  transition: stepSpring,
} as const;

export const sheetCardVariants: Variants = {
  initial: { y: 8 },
  animate: { y: 0 },
  exit: { y: 4 },
};

/** iOS-ish keyboard pad easing (CSS) */
export const KEYBOARD_PAD_TRANSITION = 'padding-bottom 180ms cubic-bezier(0.32, 0.72, 0, 1)';
