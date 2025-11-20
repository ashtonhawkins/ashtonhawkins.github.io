export const motion = {
  durations: {
    fast: 0.12,
    medium: 0.2,
    slow: 0.32
  },
  easing: [0.2, 0.8, 0.2, 1],
  easingString: "cubic-bezier(.2,.8,.2,1)",
  mediaQuery: "(prefers-reduced-motion: reduce)"
};

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia(motion.mediaQuery).matches;
