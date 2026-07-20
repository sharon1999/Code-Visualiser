/**
 * usePlayback hook
 *
 * The single integration point between React components and the Playback Engine.
 *
 * ### Responsibilities
 *   1. Create a `PlaybackEngine` singleton (stable across renders via `useRef`).
 *   2. Wire keyboard shortcuts (Space, Arrows, Home, End).
 *   3. Expose a stable action API so components don't import Redux or the engine.
 *   4. Derive the `PlaybackContext` used by visualizers.
 *
 * ### Why a custom hook instead of connecting components directly?
 *   Components should not care whether playback uses Redux, Zustand or signals.
 *   Wrapping everything here isolates that decision.  Changing the state
 *   management layer requires changes only in this file and the store.
 *
 * ### Keyboard shortcut lifetime
 *   Listeners are registered once on mount and removed on unmount.
 *   The handler is re-created only when the engine reference changes (i.e. never).
 */

import { useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../store/store";
// Static ESM import — require() is not available in Vite/ESM builds.
import { store } from "../store/store";
import { PlaybackEngine } from "../playback/PlaybackEngine";
import type { PlaybackEvent, PlaybackEventType } from "../playback/PlaybackEngine";
import {
  selectPlaybackContext,
  selectCurrentSnapshot,
  selectIsPlaying,
  selectSpeed,
  selectCurrentStep,
  selectSnapshotCount,
  selectInitialized,
  selectPlaybackProgress,
  selectIsAtEnd,
  selectIsAtStart,
} from "../store/playback/selectors";
import { loadSnapshots, clear } from "../store/playback/actions";
import type { ExecutionSnapshot } from "../types";
import type { PlaybackContext } from "./PlaybackContext";

// ─── Return type ──────────────────────────────────────────────────────────────

export interface UsePlaybackReturn {
  // ── State ────────────────────────────────────────────────────────────────
  context: PlaybackContext | null;
  currentSnapshot: ExecutionSnapshot | undefined;
  currentStep: number;
  snapshotCount: number;
  isPlaying: boolean;
  speed: number;
  initialized: boolean;
  progress: number;
  isAtEnd: boolean;
  isAtStart: boolean;

  // ── Actions ──────────────────────────────────────────────────────────────
  play: () => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  jumpTo: (step: number) => void;
  stop: () => void;
  restart: () => void;
  setSpeed: (speed: number) => void;
  load: (snapshots: ExecutionSnapshot[]) => void;
  clearAll: () => void;

  // ── Engine events ─────────────────────────────────────────────────────────
  onEvent: (type: PlaybackEventType, fn: (e: PlaybackEvent) => void) => void;
  offEvent: (type: PlaybackEventType, fn: (e: PlaybackEvent) => void) => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function usePlayback(): UsePlaybackReturn {
  const dispatch = useDispatch<AppDispatch>();

  // ── Engine singleton ────────────────────────────────────────────────────
  // The engine is created once.  It holds a stable reference to dispatch and
  // a `getState` accessor so it can read current playback state without
  // subscribing to the Redux store (avoids render cycles).
  const engineRef = useRef<PlaybackEngine | null>(null);

  if (!engineRef.current) {
    // Use the module-level store import (ESM — no require() in Vite builds).
    engineRef.current = new PlaybackEngine(dispatch, store.getState);
  }

  const engine = engineRef.current;

  // ── Keyboard shortcuts ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when focus is in an input / textarea / Monaco editor
      const tag = (e.target as HTMLElement)?.tagName ?? "";
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.target as HTMLElement)?.closest?.(".monaco-editor")) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          engine.togglePlay();
          break;
        case "ArrowRight":
          e.preventDefault();
          engine.stepForward();
          break;
        case "ArrowLeft":
          e.preventDefault();
          engine.stepBackward();
          break;
        case "Home":
          e.preventDefault();
          engine.jumpTo(0);
          break;
        case "End": {
          e.preventDefault();
          const count = store.getState().playback.snapshots.length;
          if (count > 0) engine.jumpTo(count - 1);
          break;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [engine]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────
  useEffect(() => () => engine.destroy(), [engine]);

  // ── Selectors ───────────────────────────────────────────────────────────
  const context      = useSelector(selectPlaybackContext) as PlaybackContext | null;
  const currentSnapshot = useSelector(selectCurrentSnapshot);
  const currentStep  = useSelector(selectCurrentStep);
  const snapshotCount = useSelector(selectSnapshotCount);
  const isPlaying    = useSelector(selectIsPlaying);
  const speed        = useSelector(selectSpeed);
  const initialized  = useSelector(selectInitialized);
  const progress     = useSelector(selectPlaybackProgress);
  const isAtEnd      = useSelector(selectIsAtEnd);
  const isAtStart    = useSelector(selectIsAtStart);

  // ── Stable action callbacks ─────────────────────────────────────────────
  const handlePlay    = useCallback(() => engine.startPlay(),    [engine]);
  const handlePause   = useCallback(() => engine.startPause(),   [engine]);
  const handleToggle  = useCallback(() => engine.togglePlay(),   [engine]);
  const handleNext    = useCallback(() => engine.stepForward(),  [engine]);
  const handlePrev    = useCallback(() => engine.stepBackward(), [engine]);
  const handleJumpTo  = useCallback((s: number) => engine.jumpTo(s), [engine]);
  const handleStop    = useCallback(() => engine.startStop(),    [engine]);
  const handleRestart = useCallback(() => engine.startRestart(), [engine]);
  const handleSpeed   = useCallback((s: number) => engine.changeSpeed(s), [engine]);
  const handleLoad    = useCallback((snaps: ExecutionSnapshot[]) => dispatch(loadSnapshots(snaps)), [dispatch]);
  const handleClear   = useCallback(() => dispatch(clear()), [dispatch]);

  const onEvent  = useCallback((t: PlaybackEventType, fn: (e: PlaybackEvent) => void) => engine.on(t, fn), [engine]);
  const offEvent = useCallback((t: PlaybackEventType, fn: (e: PlaybackEvent) => void) => engine.off(t, fn), [engine]);

  return {
    context,
    currentSnapshot,
    currentStep,
    snapshotCount,
    isPlaying,
    speed,
    initialized,
    progress,
    isAtEnd,
    isAtStart,
    play: handlePlay,
    pause: handlePause,
    toggle: handleToggle,
    next: handleNext,
    previous: handlePrev,
    jumpTo: handleJumpTo,
    stop: handleStop,
    restart: handleRestart,
    setSpeed: handleSpeed,
    load: handleLoad,
    clearAll: handleClear,
    onEvent,
    offEvent,
  };
}
