/** Framer Motion animation presets shared across all visualizers. */

export const CELL_SPRING = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

export const POINTER_SPRING = {
  type: "spring" as const,
  stiffness: 600,
  damping: 40,
};

export const FADE_IN = {
  initial: { opacity: 0, scale: 0.85 },
  animate: { opacity: 1, scale: 1 },
  exit:    { opacity: 0, scale: 0.85 },
  transition: { duration: 0.18 },
};

export const SLIDE_UP = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -12 },
  transition: { duration: 0.18 },
};

export const HIGHLIGHT_FLASH = {
  animate: { backgroundColor: ["#f59e0b40", "transparent"] },
  transition: { duration: 0.6 },
};
