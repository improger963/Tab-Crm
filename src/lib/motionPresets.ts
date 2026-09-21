import type { Variants } from 'motion/react';

/* ─────────────────────────────────────────────────────────────────────────
   ONE motion language for the whole app. Every overlay, dialog and popover
   animates through these presets — components must not invent their own
   easing/duration pairs. Mirrors --ease-premium / --ease-premium-out in
   index.css so JS and CSS transitions share the same curves.
   Rule of the house: exits are always faster than entries.
   ───────────────────────────────────────────────────────────────────────── */

export type Ease = [number, number, number, number];

/** Signature settle curve (used everywhere as the "premium" ease-out). */
export const EASE_PREMIUM: Ease = [0.32, 0.72, 0, 1];
/** Long-tail expo ease-out — backdrop fades. */
export const EASE_GLOW: Ease = [0.16, 1, 0.3, 1];
/** Accelerating ease-in — everything leaving the screen. */
export const EASE_IN_FAST: Ease = [0.4, 0, 1, 1];

/* Modals ------------------------------------------------------------------
   Backdrop fades independently and resolves slower than the dialog pops in,
   which reads as depth (the plane behind keeps moving while the front rests). */
export const MODAL_BACKDROP: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.24, ease: EASE_GLOW } },
  exit: { opacity: 0, transition: { duration: 0.16, ease: EASE_IN_FAST } },
};

export const MODAL_SHELL: Variants = {
  initial: { opacity: 0, scale: 0.96, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.18, ease: EASE_PREMIUM } },
  exit: { opacity: 0, scale: 0.97, y: 4, transition: { duration: 0.12, ease: EASE_IN_FAST } },
};

/* Dropdowns / popovers ------------------------------------------------------
   Subtle scale + fade + tiny drift against the anchor edge; closes ~30%
   faster than it opens so repeated filter tweaking never feels laggy. */
export const POPOVER_PANEL: Variants = {
  initial: { opacity: 0, scale: 0.97, y: -4 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.16, ease: EASE_PREMIUM } },
  exit: { opacity: 0, scale: 0.98, y: -2, transition: { duration: 0.11, ease: EASE_IN_FAST } },
};

/* Durations for one-off transitions that only need a curve + length -------- */
export const MICRO_ENTER = { duration: 0.2, ease: EASE_PREMIUM };
export const MICRO_EXIT = { duration: 0.14, ease: EASE_IN_FAST };
