/**
 * Unit tests for playback selectors.
 *
 * Selectors are tested against a minimal mock RootState so tests never
 * hit the real Redux store.
 */

import { describe, it, expect } from "vitest";
import {
  selectCurrentSnapshot,
  selectPreviousSnapshot,
  selectNextSnapshot,
  selectPlaybackProgress,
  selectIsAtEnd,
  selectIsAtStart,
  selectPlaybackContext,
} from "../../store/playback/selectors";
import type { PlaybackState } from "../../store/playback/playbackSlice";
import type { RootState } from "../../store/store";
import type { ExecutionSnapshot } from "../../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSnapshot(id: number): ExecutionSnapshot {
  return {
    id,
    line: id,
    variables: {},
    heap: {},
    callStack: [{ functionName: "<global>", line: null }],
    console: [],
    timestamp: id * 100,
    executionContext: { currentFunction: "<global>", loopDepth: 0 },
  };
}

const snaps = [makeSnapshot(1), makeSnapshot(2), makeSnapshot(3)];

function makeState(overrides: Partial<PlaybackState> = {}): RootState {
  const playback: PlaybackState = {
    snapshots: snaps,
    currentStep: 1,
    playing: false,
    speed: 1,
    direction: "forward",
    initialized: true,
    ...overrides,
  };
  // We only need the playback key for these tests
  return { playback } as unknown as RootState;
}

// ─── selectCurrentSnapshot ────────────────────────────────────────────────────

describe("selectCurrentSnapshot", () => {
  it("returns the snapshot at currentStep", () => {
    expect(selectCurrentSnapshot(makeState({ currentStep: 0 }))).toBe(snaps[0]);
    expect(selectCurrentSnapshot(makeState({ currentStep: 2 }))).toBe(snaps[2]);
  });

  it("returns undefined when snapshots are empty", () => {
    const state = makeState({ snapshots: [], currentStep: 0 });
    expect(selectCurrentSnapshot(state)).toBeUndefined();
  });
});

// ─── selectPreviousSnapshot ───────────────────────────────────────────────────

describe("selectPreviousSnapshot", () => {
  it("returns the snapshot before current", () => {
    expect(selectPreviousSnapshot(makeState({ currentStep: 1 }))).toBe(snaps[0]);
  });

  it("returns undefined at step 0", () => {
    expect(selectPreviousSnapshot(makeState({ currentStep: 0 }))).toBeUndefined();
  });
});

// ─── selectNextSnapshot ───────────────────────────────────────────────────────

describe("selectNextSnapshot", () => {
  it("returns the snapshot after current", () => {
    expect(selectNextSnapshot(makeState({ currentStep: 1 }))).toBe(snaps[2]);
  });

  it("returns undefined at the last step", () => {
    expect(selectNextSnapshot(makeState({ currentStep: 2 }))).toBeUndefined();
  });
});

// ─── selectPlaybackProgress ───────────────────────────────────────────────────

describe("selectPlaybackProgress", () => {
  it("returns 0 at step 0", () => {
    expect(selectPlaybackProgress(makeState({ currentStep: 0 }))).toBe(0);
  });

  it("returns 1 at the last step", () => {
    expect(selectPlaybackProgress(makeState({ currentStep: 2 }))).toBe(1);
  });

  it("returns 0.5 at the middle step", () => {
    expect(selectPlaybackProgress(makeState({ currentStep: 1 }))).toBeCloseTo(0.5);
  });

  it("returns 0 for single-snapshot timeline", () => {
    const state = makeState({ snapshots: [snaps[0]], currentStep: 0 });
    expect(selectPlaybackProgress(state)).toBe(0);
  });
});

// ─── selectIsAtEnd / selectIsAtStart ─────────────────────────────────────────

describe("selectIsAtEnd", () => {
  it("returns true at the last step", () => {
    expect(selectIsAtEnd(makeState({ currentStep: 2 }))).toBe(true);
  });

  it("returns false before the last step", () => {
    expect(selectIsAtEnd(makeState({ currentStep: 1 }))).toBe(false);
  });
});

describe("selectIsAtStart", () => {
  it("returns true at step 0", () => {
    expect(selectIsAtStart(makeState({ currentStep: 0 }))).toBe(true);
  });

  it("returns false after step 0", () => {
    expect(selectIsAtStart(makeState({ currentStep: 1 }))).toBe(false);
  });
});

// ─── selectPlaybackContext ────────────────────────────────────────────────────

describe("selectPlaybackContext", () => {
  it("returns null when no current snapshot", () => {
    const state = makeState({ snapshots: [], currentStep: 0 });
    expect(selectPlaybackContext(state)).toBeNull();
  });

  it("contains current, previous, next snapshots", () => {
    const ctx = selectPlaybackContext(makeState({ currentStep: 1 }));
    expect(ctx?.current).toBe(snaps[1]);
    expect(ctx?.previous).toBe(snaps[0]);
    expect(ctx?.next).toBe(snaps[2]);
  });

  it("has no previous at step 0", () => {
    const ctx = selectPlaybackContext(makeState({ currentStep: 0 }));
    expect(ctx?.previous).toBeUndefined();
  });

  it("reflects direction", () => {
    const ctx = selectPlaybackContext(makeState({ direction: "backward" }));
    expect(ctx?.direction).toBe("backward");
  });

  it("reflects playing state", () => {
    const ctx = selectPlaybackContext(makeState({ playing: true }));
    expect(ctx?.playing).toBe(true);
  });
});
