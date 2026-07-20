/**
 * Playback Slice — Phase 8
 *
 * Single source of truth for all playback state.
 *
 * ### Design decisions
 *
 * 1. Snapshots are stored **by reference** — no deep-clone, no copy.
 *    Redux Toolkit's Immer produces structural sharing, so storing 10 000
 *    `ExecutionSnapshot` objects is just a pointer array.
 *
 * 2. `currentStep` is a 0-based index into `snapshots`.
 *    All selectors derive their values from this single integer.
 *
 * 3. `playing` / `speed` live here so the `PlaybackEngine` can subscribe
 *    to them without coupling to React context.
 *
 * 4. `direction` tracks which way the user last moved.  Visualizers and
 *    animations can use it to decide enter/exit directions.
 *
 * 5. `initialized` is false until `loadSnapshots()` is dispatched; UI guards
 *    on this flag to avoid rendering the timeline before data is ready.
 */

import {
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import type { ExecutionSnapshot } from "../../types";

// ─── State shape ──────────────────────────────────────────────────────────────

export interface PlaybackState {
  /** The ordered array of snapshots produced by one code execution. */
  snapshots: ExecutionSnapshot[];
  /** 0-based index of the currently displayed snapshot. */
  currentStep: number;
  /** `true` while the engine is auto-advancing through snapshots. */
  playing: boolean;
  /** Playback speed multiplier: 0.25 | 0.5 | 1 | 2 | 4 | 8 */
  speed: number;
  /** Which direction the user last moved, used for animation hints. */
  direction: "forward" | "backward";
  /** `false` until the first `loadSnapshots` dispatch. */
  initialized: boolean;
}

// ─── Allowed speed values ─────────────────────────────────────────────────────

export const PLAYBACK_SPEEDS = [0.25, 0.5, 1, 2, 4, 8] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

// ─── Initial state ────────────────────────────────────────────────────────────

const initialState: PlaybackState = {
  snapshots: [],
  currentStep: 0,
  playing: false,
  speed: 1,
  direction: "forward",
  initialized: false,
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const playbackSlice = createSlice({
  name: "playback",
  initialState,
  reducers: {
    /**
     * Load a fresh set of snapshots and reset playback position to the start.
     * Dispatched once per code execution by the executor service.
     */
    loadSnapshots(state, action: PayloadAction<ExecutionSnapshot[]>) {
      state.snapshots = action.payload;
      state.currentStep = 0;
      state.playing = false;
      state.direction = "forward";
      state.initialized = action.payload.length > 0;
    },

    /**
     * Advance one snapshot forward.
     * Clamps at the last snapshot; auto-pauses when the end is reached.
     */
    next(state) {
      if (state.snapshots.length === 0) return;
      const last = state.snapshots.length - 1;
      if (state.currentStep < last) {
        state.currentStep += 1;
        state.direction = "forward";
      } else {
        // End of timeline — pause automatically
        state.playing = false;
      }
    },

    /**
     * Move one snapshot backward.
     * Clamps at 0.
     */
    previous(state) {
      if (state.currentStep > 0) {
        state.currentStep -= 1;
        state.direction = "backward";
      }
    },

    /**
     * Jump directly to any snapshot by 0-based index.
     * Out-of-range values are silently clamped.
     */
    goTo(state, action: PayloadAction<number>) {
      if (state.snapshots.length === 0) return;
      const clamped = Math.max(
        0,
        Math.min(action.payload, state.snapshots.length - 1),
      );
      state.direction = clamped >= state.currentStep ? "forward" : "backward";
      state.currentStep = clamped;
    },

    /** Begin automatic playback. No-op when already at the last snapshot. */
    play(state) {
      if (state.snapshots.length === 0) return;
      if (state.currentStep < state.snapshots.length - 1) {
        state.playing = true;
        state.direction = "forward";
      }
    },

    /** Pause automatic playback. */
    pause(state) {
      state.playing = false;
    },

    /**
     * Stop playback and return to step 0.
     * Equivalent to pause + goTo(0).
     */
    stop(state) {
      state.playing = false;
      state.currentStep = 0;
      state.direction = "forward";
    },

    /**
     * Restart: jump to step 0 and immediately start playing.
     * Useful for the ↺ button.
     */
    restart(state) {
      if (state.snapshots.length === 0) return;
      state.currentStep = 0;
      state.direction = "forward";
      state.playing = true;
    },

    /**
     * Change the playback speed multiplier.
     * Unrecognised values are silently ignored.
     */
    setSpeed(state, action: PayloadAction<number>) {
      if (PLAYBACK_SPEEDS.includes(action.payload as PlaybackSpeed)) {
        state.speed = action.payload;
      }
    },

    /**
     * Wipe all snapshot data and reset to initial state.
     * Called when the user starts a new execution.
     */
    clear() {
      return initialState;
    },
  },
});

export const {
  loadSnapshots,
  next,
  previous,
  goTo,
  play,
  pause,
  stop,
  restart,
  setSpeed,
  clear,
} = playbackSlice.actions;

export default playbackSlice.reducer;
