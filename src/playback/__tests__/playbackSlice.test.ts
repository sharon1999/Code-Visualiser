/**
 * Unit tests for the playback Redux slice.
 *
 * Every test uses the raw reducer function directly — no store, no React,
 * no async — so tests are fast and completely deterministic.
 */

import { describe, it, expect } from "vitest";
import reducer, {
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
  type PlaybackState,
} from "../../store/playback/playbackSlice";
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

const snap1 = makeSnapshot(1);
const snap2 = makeSnapshot(2);
const snap3 = makeSnapshot(3);
const THREE_SNAPS = [snap1, snap2, snap3];

function loadedState(snapshots = THREE_SNAPS): PlaybackState {
  return reducer(undefined, loadSnapshots(snapshots));
}

// ─── loadSnapshots ────────────────────────────────────────────────────────────

describe("loadSnapshots", () => {
  it("stores the snapshot array", () => {
    const state = loadedState();
    expect(state.snapshots).toHaveLength(3);
  });

  it("resets currentStep to 0", () => {
    const mid = reducer(loadedState(), goTo(2));
    const fresh = reducer(mid, loadSnapshots(THREE_SNAPS));
    expect(fresh.currentStep).toBe(0);
  });

  it("sets initialized to true for non-empty snapshots", () => {
    expect(loadedState().initialized).toBe(true);
  });

  it("keeps initialized false for empty array", () => {
    const state = reducer(undefined, loadSnapshots([]));
    expect(state.initialized).toBe(false);
  });

  it("stops playing when reloaded", () => {
    const playing = reducer(loadedState(), play());
    const fresh = reducer(playing, loadSnapshots(THREE_SNAPS));
    expect(fresh.playing).toBe(false);
  });
});

// ─── next ────────────────────────────────────────────────────────────────────

describe("next", () => {
  it("increments currentStep", () => {
    const state = reducer(loadedState(), next());
    expect(state.currentStep).toBe(1);
  });

  it("sets direction to forward", () => {
    const state = reducer(loadedState(), next());
    expect(state.direction).toBe("forward");
  });

  it("clamps at the last snapshot", () => {
    let state = reducer(loadedState(), goTo(2));
    state = reducer(state, next());
    expect(state.currentStep).toBe(2);
  });

  it("pauses automatically at the last snapshot", () => {
    let state = reducer(loadedState(), play());
    state = reducer(state, goTo(2));
    state = reducer(state, next()); // at end → should pause
    expect(state.playing).toBe(false);
  });

  it("does nothing when no snapshots", () => {
    const state = reducer(undefined, next());
    expect(state.currentStep).toBe(0);
  });
});

// ─── previous ─────────────────────────────────────────────────────────────────

describe("previous", () => {
  it("decrements currentStep", () => {
    const state = reducer(reducer(loadedState(), goTo(2)), previous());
    expect(state.currentStep).toBe(1);
  });

  it("sets direction to backward", () => {
    const state = reducer(reducer(loadedState(), goTo(1)), previous());
    expect(state.direction).toBe("backward");
  });

  it("clamps at 0", () => {
    const state = reducer(loadedState(), previous());
    expect(state.currentStep).toBe(0);
  });
});

// ─── goTo ─────────────────────────────────────────────────────────────────────

describe("goTo", () => {
  it("jumps to the given step", () => {
    const state = reducer(loadedState(), goTo(2));
    expect(state.currentStep).toBe(2);
  });

  it("clamps negative values to 0", () => {
    const state = reducer(loadedState(), goTo(-5));
    expect(state.currentStep).toBe(0);
  });

  it("clamps values beyond the last step", () => {
    const state = reducer(loadedState(), goTo(999));
    expect(state.currentStep).toBe(2);
  });

  it("sets direction forward when jumping ahead", () => {
    const state = reducer(reducer(loadedState(), goTo(0)), goTo(2));
    expect(state.direction).toBe("forward");
  });

  it("sets direction backward when jumping behind", () => {
    const state = reducer(reducer(loadedState(), goTo(2)), goTo(0));
    expect(state.direction).toBe("backward");
  });
});

// ─── play / pause ─────────────────────────────────────────────────────────────

describe("play / pause", () => {
  it("sets playing to true", () => {
    const state = reducer(loadedState(), play());
    expect(state.playing).toBe(true);
  });

  it("does not play when at the last snapshot", () => {
    const atEnd = reducer(loadedState(), goTo(2));
    const state = reducer(atEnd, play());
    expect(state.playing).toBe(false);
  });

  it("pause sets playing to false", () => {
    const playing = reducer(loadedState(), play());
    const state = reducer(playing, pause());
    expect(state.playing).toBe(false);
  });
});

// ─── stop ─────────────────────────────────────────────────────────────────────

describe("stop", () => {
  it("resets currentStep to 0", () => {
    const state = reducer(reducer(loadedState(), goTo(2)), stop());
    expect(state.currentStep).toBe(0);
  });

  it("sets playing to false", () => {
    const state = reducer(reducer(loadedState(), play()), stop());
    expect(state.playing).toBe(false);
  });
});

// ─── restart ─────────────────────────────────────────────────────────────────

describe("restart", () => {
  it("jumps to step 0", () => {
    const state = reducer(reducer(loadedState(), goTo(2)), restart());
    expect(state.currentStep).toBe(0);
  });

  it("sets playing to true", () => {
    const state = reducer(loadedState(), restart());
    expect(state.playing).toBe(true);
  });

  it("does nothing with empty snapshots", () => {
    const state = reducer(undefined, restart());
    expect(state.playing).toBe(false);
  });
});

// ─── setSpeed ─────────────────────────────────────────────────────────────────

describe("setSpeed", () => {
  it("sets valid speed values", () => {
    for (const s of [0.25, 0.5, 1, 2, 4, 8]) {
      const state = reducer(undefined, setSpeed(s));
      expect(state.speed).toBe(s);
    }
  });

  it("ignores invalid speed values", () => {
    const state = reducer(undefined, setSpeed(3));
    expect(state.speed).toBe(1); // unchanged from default
  });
});

// ─── clear ────────────────────────────────────────────────────────────────────

describe("clear", () => {
  it("resets to initial state", () => {
    let state = reducer(loadedState(), play());
    state = reducer(state, goTo(2));
    state = reducer(state, clear());
    expect(state.snapshots).toHaveLength(0);
    expect(state.currentStep).toBe(0);
    expect(state.playing).toBe(false);
    expect(state.initialized).toBe(false);
  });
});
