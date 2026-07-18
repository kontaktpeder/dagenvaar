import type { Transition, Variants } from 'framer-motion';

/** Snappy page / month strip spring — iOS-like settle */
export const snapSpring: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 40,
  mass: 0.7,
};

/** Modal / sheet card enter */
export const sheetSpring: Transition = {
  type: 'spring',
  stiffness: 420,
  damping: 36,
  mass: 0.8,
};

/** Wizard step push/pop */
export const stepSpring: Transition = {
  type: 'spring',
  stiffness: 380,
  damping: 34,
  mass: 0.75,
};

export const fadeQuick: Transition = {
  duration: 0.18,
  ease: [0.32, 0.72, 0, 1],
};

export const stepForward = {
  initial: { x: 24, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: -24, opacity: 0 },
  transition: stepSpring,
} as const;

export const sheetCardVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 6 },
};

/** iOS-ish keyboard pad easing (CSS) */
export const KEYBOARD_PAD_TRANSITION = 'padding-bottom 180ms cubic-bezier(0.32, 0.72, 0, 1)';
