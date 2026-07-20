/**
 * PlaybackContext type
 *
 * The derived context consumed by visualizers.
 * Visualizers never read Redux directly — they receive this object,
 * keeping them decoupled from the state management layer.
 */

import type { ExecutionSnapshot } from "../types";

export interface PlaybackContext {
  /** The snapshot immediately before the current one, if any. */
  previous?: ExecutionSnapshot;
  /** The snapshot currently being displayed. */
  current: ExecutionSnapshot;
  /** The snapshot immediately after the current one, if any. */
  next?: ExecutionSnapshot;
  /** Which direction the engine last moved. Used for animation hints. */
  direction: "forward" | "backward";
  /** Fraction [0, 1] representing position in the timeline. */
  progress: number;
  /** Whether auto-play is active. */
  playing: boolean;
}
