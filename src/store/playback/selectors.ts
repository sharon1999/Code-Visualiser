/**
 * Playback Selectors
 *
 * All selectors are memoised with `createSelector` so they only recompute
 * when the exact slice of state they depend on changes.
 *
 * ### Why memoised selectors matter here
 * The playback slice can hold 10 000+ snapshots.  Without memoisation,
 * `selectCurrentSnapshot` would re-run on every Redux dispatch — even
 * unrelated ones (editor changes, etc.).  With `createSelector`, the output
 * is cached until `snapshots` or `currentStep` actually changes.
 *
 * ### Naming convention
 * All selectors are named `select<Thing>` and live in this file so that
 * components never import from the slice directly.
 */

import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../store";
import type { PlaybackState } from "./playbackSlice";

// ─── Root selector ────────────────────────────────────────────────────────────

export const selectPlayback = (state: RootState): PlaybackState =>
  state.playback;

// ─── Primitive selectors (no memoisation needed — O(1) field access) ──────────

export const selectSnapshots = (state: RootState) => state.playback.snapshots;
export const selectCurrentStep = (state: RootState) => state.playback.currentStep;
export const selectIsPlaying = (state: RootState) => state.playback.playing;
export const selectSpeed = (state: RootState) => state.playback.speed;
export const selectDirection = (state: RootState) => state.playback.direction;
export const selectInitialized = (state: RootState) => state.playback.initialized;
export const selectSnapshotCount = (state: RootState) =>
  state.playback.snapshots.length;

// ─── Derived selectors (memoised) ─────────────────────────────────────────────

/**
 * Returns the ExecutionSnapshot for the current step.
 * Returns `undefined` when no snapshots are loaded.
 */
export const selectCurrentSnapshot = createSelector(
  [selectSnapshots, selectCurrentStep],
  (snapshots, currentStep) => snapshots[currentStep],
);

/**
 * Returns the snapshot one step behind the current step.
 * Returns `undefined` at step 0 or when the timeline is empty.
 */
export const selectPreviousSnapshot = createSelector(
  [selectSnapshots, selectCurrentStep],
  (snapshots, currentStep) =>
    currentStep > 0 ? snapshots[currentStep - 1] : undefined,
);

/**
 * Returns the snapshot one step ahead of the current step.
 * Returns `undefined` at the last step.
 */
export const selectNextSnapshot = createSelector(
  [selectSnapshots, selectCurrentStep],
  (snapshots, currentStep) =>
    currentStep < snapshots.length - 1
      ? snapshots[currentStep + 1]
      : undefined,
);

/**
 * Progress fraction in [0, 1].
 * 0 = first snapshot, 1 = last snapshot.
 * Returns 0 when the timeline has fewer than 2 snapshots.
 */
export const selectPlaybackProgress = createSelector(
  [selectCurrentStep, selectSnapshotCount],
  (currentStep, count) => {
    if (count < 2) return 0;
    return currentStep / (count - 1);
  },
);

/**
 * `true` when the current step is the last snapshot.
 */
export const selectIsAtEnd = createSelector(
  [selectCurrentStep, selectSnapshotCount],
  (currentStep, count) => count > 0 && currentStep === count - 1,
);

/**
 * `true` when the current step is step 0.
 */
export const selectIsAtStart = createSelector(
  [selectCurrentStep],
  (currentStep) => currentStep === 0,
);

/**
 * The full `PlaybackContext` consumed by visualizers.
 * Memoised so a visualizer re-renders only when its actual data changes.
 */
export const selectPlaybackContext = createSelector(
  [
    selectPreviousSnapshot,
    selectCurrentSnapshot,
    selectNextSnapshot,
    selectDirection,
    selectPlaybackProgress,
    selectIsPlaying,
  ],
  (previous, current, next, direction, progress, playing) => {
    if (!current) return null;
    return { previous, current, next, direction, progress, playing };
  },
);
