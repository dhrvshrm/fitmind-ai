/**
 * Shared animation timings. Motion stays short and subtle: it should guide
 * the eye (what appeared, what changed), never slow anyone down. Everything
 * respects the system "reduce motion" setting via MotionConfig in App.
 */
export const MOTION = {
  /** Fade-up for content as it appears. */
  revealDuration: 0.32,
  revealDistance: 12,
  /** Delay between items in a list, and the most items that get a delay. */
  stagger: 0.045,
  maxStaggerItems: 8,
  ease: [0.22, 1, 0.36, 1] as const,
  /** Numbers counting to a new value. */
  countDuration: 0.6,
  /** Hover lift on clickable cards. */
  hoverLift: -2,
} as const;
