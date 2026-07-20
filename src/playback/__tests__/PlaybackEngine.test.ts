/**
 * Unit tests for PlaybackEngine.
 *
 * The engine is tested with:
 *   - A mock `dispatch` spy to assert which Redux actions were dispatched.
 *   - A `getState` factory that returns the slice of state we want.
 *
 * Note: RAF-based autoplay is NOT tested here (browser-only API).
 * Those code paths are covered by integration tests (Playwright/Cypress).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { PlaybackEngine } from "../../playback/PlaybackEngine";
import type { RootState } from "../../store/store";
import type { PlaybackState } from "../../store/playback/playbackSlice";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePlaybackState(overrides: Partial<PlaybackState> = {}): PlaybackState {
  return {
    snapshots: new Array(5).fill(null).map((_, i) => ({
      id: i,
      line: i,
      variables: {},
      heap: {},
      callStack: [],
      console: [],
      timestamp: i * 100,
      executionContext: { currentFunction: "<global>", loopDepth: 0 },
    })),
    currentStep: 0,
    playing: false,
    speed: 1,
    direction: "forward",
    initialized: true,
    ...overrides,
  };
}

function makeEngine(stateOverrides: Partial<PlaybackState> = {}) {
  const dispatch = vi.fn();
  let playbackState = makePlaybackState(stateOverrides);

  const getState = (): RootState =>
    ({ playback: playbackState } as unknown as RootState);

  const setPlaybackState = (p: Partial<PlaybackState>) => {
    playbackState = { ...playbackState, ...p };
  };

  const engine = new PlaybackEngine(dispatch, getState);
  return { engine, dispatch, setPlaybackState };
}

// ─── stepForward ──────────────────────────────────────────────────────────────

describe("PlaybackEngine.stepForward", () => {
  it("dispatches next()", () => {
    const { engine, dispatch } = makeEngine();
    engine.stepForward();
    expect(dispatch).toHaveBeenCalledOnce();
    expect(dispatch.mock.calls[0][0].type).toBe("playback/next");
  });

  it("emits STEP_CHANGED event", () => {
    const { engine } = makeEngine({ currentStep: 2 });
    const listener = vi.fn();
    engine.on("STEP_CHANGED", listener);
    // jumpTo always emits STEP_CHANGED unconditionally — good for testing the event system
    engine.jumpTo(3);
    expect(listener).toHaveBeenCalledOnce();
  });

  it("emits PLAYBACK_FINISHED when at the last step", () => {
    const { engine, setPlaybackState } = makeEngine({ currentStep: 4 });
    const finishListener = vi.fn();
    engine.on("PLAYBACK_FINISHED", finishListener);

    // At the last step — next() doesn't advance, isAtEnd returns true
    setPlaybackState({ currentStep: 4 });
    engine.stepForward();
    expect(finishListener).toHaveBeenCalledOnce();
  });
});

// ─── stepBackward ─────────────────────────────────────────────────────────────

describe("PlaybackEngine.stepBackward", () => {
  it("dispatches goTo(currentStep - 1)", () => {
    const { engine, dispatch } = makeEngine({ currentStep: 3 });
    engine.stepBackward();
    expect(dispatch).toHaveBeenCalledOnce();
    expect(dispatch.mock.calls[0][0].type).toBe("playback/goTo");
    expect(dispatch.mock.calls[0][0].payload).toBe(2);
  });

  it("does not dispatch when at step 0", () => {
    const { engine, dispatch } = makeEngine({ currentStep: 0 });
    engine.stepBackward();
    expect(dispatch).not.toHaveBeenCalled();
  });
});

// ─── jumpTo ───────────────────────────────────────────────────────────────────

describe("PlaybackEngine.jumpTo", () => {
  it("dispatches goTo with the given step", () => {
    const { engine, dispatch } = makeEngine();
    engine.jumpTo(3);
    expect(dispatch.mock.calls[0][0].type).toBe("playback/goTo");
    expect(dispatch.mock.calls[0][0].payload).toBe(3);
  });

  it("emits STEP_CHANGED", () => {
    const { engine } = makeEngine();
    const listener = vi.fn();
    engine.on("STEP_CHANGED", listener);
    engine.jumpTo(2);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ type: "STEP_CHANGED" }));
  });
});

// ─── startPlay / startPause ───────────────────────────────────────────────────

describe("PlaybackEngine.startPlay", () => {
  it("dispatches play()", () => {
    const { engine, dispatch } = makeEngine();
    engine.startPlay();
    expect(dispatch.mock.calls[0][0].type).toBe("playback/play");
  });

  it("emits PLAY_STARTED", () => {
    const { engine } = makeEngine();
    const listener = vi.fn();
    engine.on("PLAY_STARTED", listener);
    engine.startPlay();
    expect(listener).toHaveBeenCalledOnce();
    engine.destroy();
  });
});

describe("PlaybackEngine.startPause", () => {
  it("dispatches pause()", () => {
    const { engine, dispatch } = makeEngine({ playing: true });
    engine.startPause();
    expect(dispatch.mock.calls[0][0].type).toBe("playback/pause");
  });

  it("emits PLAY_PAUSED", () => {
    const { engine } = makeEngine({ playing: true });
    const listener = vi.fn();
    engine.on("PLAY_PAUSED", listener);
    engine.startPause();
    expect(listener).toHaveBeenCalledOnce();
    engine.destroy();
  });
});

// ─── togglePlay ───────────────────────────────────────────────────────────────

describe("PlaybackEngine.togglePlay", () => {
  it("calls startPlay when paused", () => {
    const { engine, dispatch } = makeEngine({ playing: false });
    engine.togglePlay();
    expect(dispatch.mock.calls[0][0].type).toBe("playback/play");
    engine.destroy();
  });

  it("calls startPause when playing", () => {
    const { engine, dispatch } = makeEngine({ playing: true });
    engine.togglePlay();
    expect(dispatch.mock.calls[0][0].type).toBe("playback/pause");
    engine.destroy();
  });
});

// ─── startStop ────────────────────────────────────────────────────────────────

describe("PlaybackEngine.startStop", () => {
  it("dispatches stop()", () => {
    const { engine, dispatch } = makeEngine();
    engine.startStop();
    expect(dispatch.mock.calls[0][0].type).toBe("playback/stop");
  });

  it("emits STOPPED", () => {
    const { engine } = makeEngine();
    const listener = vi.fn();
    engine.on("STOPPED", listener);
    engine.startStop();
    expect(listener).toHaveBeenCalledOnce();
    engine.destroy();
  });
});

// ─── startRestart ────────────────────────────────────────────────────────────

describe("PlaybackEngine.startRestart", () => {
  it("dispatches restart()", () => {
    const { engine, dispatch } = makeEngine();
    engine.startRestart();
    expect(dispatch.mock.calls[0][0].type).toBe("playback/restart");
    engine.destroy();
  });

  it("emits RESTARTED", () => {
    const { engine } = makeEngine();
    const listener = vi.fn();
    engine.on("RESTARTED", listener);
    engine.startRestart();
    expect(listener).toHaveBeenCalledOnce();
    engine.destroy();
  });
});

// ─── changeSpeed ─────────────────────────────────────────────────────────────

describe("PlaybackEngine.changeSpeed", () => {
  it("dispatches setSpeed with the given value", () => {
    const { engine, dispatch } = makeEngine();
    engine.changeSpeed(2);
    expect(dispatch.mock.calls[0][0].type).toBe("playback/setSpeed");
    expect(dispatch.mock.calls[0][0].payload).toBe(2);
  });
});

// ─── Event system ─────────────────────────────────────────────────────────────

describe("PlaybackEngine event system", () => {
  it("on/off registers and removes listeners", () => {
    const { engine } = makeEngine();
    const listener = vi.fn();
    engine.on("STOPPED", listener);
    engine.off("STOPPED", listener);
    engine.startStop();
    expect(listener).not.toHaveBeenCalled();
    engine.destroy();
  });

  it("destroy removes all listeners", () => {
    const { engine } = makeEngine();
    const listener = vi.fn();
    engine.on("STOPPED", listener);
    engine.destroy();
    engine.startStop();
    expect(listener).not.toHaveBeenCalled();
  });
});
