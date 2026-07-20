/**
 * PlaybackEngine
 *
 * A **framework-agnostic** class that drives automatic playback.
 *
 * ### Design
 *
 * The engine owns a single `requestAnimationFrame` loop and decides when to
 * advance the timeline based on elapsed wall-clock time and the current speed.
 * It never reads from or writes to React state directly — it only dispatches
 * Redux actions.  This makes it trivially testable: inject a mock dispatcher
 * and assert which actions were dispatched.
 *
 * ### Why RAF instead of setInterval?
 * `setInterval` is throttled to ~1 Hz in background tabs and can drift due
 * to event-loop pressure.  RAF pauses automatically when the tab is hidden,
 * preventing runaway dispatches, and runs at the display refresh rate giving
 * smoother UI updates.
 *
 * ### Event system
 * The engine emits typed events so that future subscribers (Monaco gutter
 * highlights, chart animations) can react without polling Redux.
 *
 * ### Thread safety
 * All methods are synchronous and single-threaded (JS).  No locking needed.
 */

import type { AppDispatch } from "../store/store";
import {
  next,
  pause,
  play,
  restart,
  stop,
  goTo,
  setSpeed,
} from "../store/playback/actions";
import type { RootState } from "../store/store";

// ─── Event system ─────────────────────────────────────────────────────────────

export type PlaybackEventType =
  | "PLAY_STARTED"
  | "PLAY_PAUSED"
  | "STEP_CHANGED"
  | "PLAYBACK_FINISHED"
  | "RESTARTED"
  | "STOPPED";

export interface PlaybackEvent {
  type: PlaybackEventType;
  /** Step index at the time the event fired. */
  step: number;
  /** Unix timestamp of the event. */
  at: number;
}

type PlaybackEventListener = (event: PlaybackEvent) => void;

// ─── Base playback speed (ms per snapshot at 1×) ──────────────────────────────

const BASE_INTERVAL_MS = 600;

// ─── PlaybackEngine ───────────────────────────────────────────────────────────

export class PlaybackEngine {
  private _dispatch: AppDispatch;
  private _getState: () => RootState;

  // RAF handle; null when stopped
  private _rafHandle: number | null = null;
  // Wall-clock time of the last step advance
  private _lastStepAt = 0;

  // Event listener registry
  private _listeners = new Map<PlaybackEventType, Set<PlaybackEventListener>>();

  constructor(dispatch: AppDispatch, getState: () => RootState) {
    this._dispatch = dispatch;
    this._getState = getState;
  }

  // ── Public control API ────────────────────────────────────────────────────

  /**
   * Start automatic playback.
   * Dispatches `play()` and begins the RAF loop.
   */
  startPlay(): void {
    this._dispatch(play());
    this._lastStepAt = performance.now();
    this._startLoop();
    this._emit("PLAY_STARTED");
  }

  /**
   * Pause automatic playback.
   * The RAF loop is cancelled; the current step is preserved.
   */
  startPause(): void {
    this._dispatch(pause());
    this._stopLoop();
    this._emit("PLAY_PAUSED");
  }

  /**
   * Toggle between play and pause.
   * Convenience method for the Space bar keyboard shortcut.
   */
  togglePlay(): void {
    const { playing } = this._getState().playback;
    if (playing) {
      this.startPause();
    } else {
      this.startPlay();
    }
  }

  /** Advance one snapshot forward. */
  stepForward(): void {
    const before = this._getState().playback.currentStep;
    this._dispatch(next());
    const after = this._getState().playback.currentStep;
    if (after !== before) {
      this._emit("STEP_CHANGED", after);
    }
    // If we just hit the end, stop the loop
    if (this._isAtEnd()) {
      this._stopLoop();
      this._emit("PLAYBACK_FINISHED", after);
    }
  }

  /** Move one snapshot backward. */
  stepBackward(): void {
    const { currentStep } = this._getState().playback;
    if (currentStep <= 0) return;
    this._dispatch(goTo(currentStep - 1));
    this._emit("STEP_CHANGED", currentStep - 1);
  }

  /** Jump directly to any step by 0-based index. */
  jumpTo(step: number): void {
    this._dispatch(goTo(step));
    this._emit("STEP_CHANGED", step);
  }

  /** Stop playback and return to step 0. */
  startStop(): void {
    this._dispatch(stop());
    this._stopLoop();
    this._emit("STOPPED", 0);
  }

  /** Restart from step 0 and immediately play. */
  startRestart(): void {
    this._dispatch(restart());
    this._lastStepAt = performance.now();
    this._startLoop();
    this._emit("RESTARTED", 0);
  }

  /** Change the playback speed multiplier. */
  changeSpeed(speed: number): void {
    this._dispatch(setSpeed(speed));
  }

  // ── Event emitter API ─────────────────────────────────────────────────────

  on(type: PlaybackEventType, listener: PlaybackEventListener): void {
    if (!this._listeners.has(type)) this._listeners.set(type, new Set());
    this._listeners.get(type)!.add(listener);
  }

  off(type: PlaybackEventType, listener: PlaybackEventListener): void {
    this._listeners.get(type)?.delete(listener);
  }

  /** Remove all listeners. Call this on component unmount. */
  destroy(): void {
    this._stopLoop();
    this._listeners.clear();
  }

  // ── Private RAF loop ──────────────────────────────────────────────────────

  private _startLoop(): void {
    if (this._rafHandle !== null) return; // already running
    this._tick();
  }

  private _stopLoop(): void {
    if (this._rafHandle !== null) {
      cancelAnimationFrame(this._rafHandle);
      this._rafHandle = null;
    }
  }

  private _tick = (): void => {
    const state = this._getState().playback;

    // If Redux says we're not playing, stop the loop gracefully
    if (!state.playing) {
      this._rafHandle = null;
      return;
    }

    const now = performance.now();
    const intervalMs = BASE_INTERVAL_MS / state.speed;

    if (now - this._lastStepAt >= intervalMs) {
      this._lastStepAt = now;
      this.stepForward();

      // stepForward may have stopped playing — check before scheduling next frame
      if (!this._getState().playback.playing) {
        this._rafHandle = null;
        return;
      }
    }

    this._rafHandle = requestAnimationFrame(this._tick);
  };

  private _isAtEnd(): boolean {
    const { currentStep, snapshots } = this._getState().playback;
    return snapshots.length > 0 && currentStep >= snapshots.length - 1;
  }

  private _emit(type: PlaybackEventType, step?: number): void {
    const event: PlaybackEvent = {
      type,
      step: step ?? this._getState().playback.currentStep,
      at: Date.now(),
    };
    this._listeners.get(type)?.forEach((fn) => fn(event));
  }
}
