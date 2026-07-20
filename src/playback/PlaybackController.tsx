/**
 * PlaybackController
 *
 * The top-level playback toolbar.  Assembles all sub-components:
 *   - Transport buttons (⏮ ▶/⏸ ⏭ ⏹ ↺)
 *   - Timeline / slider
 *   - StepCounter
 *   - SpeedSelector
 *
 * ### Design
 *
 * This component is the **only** component that calls `usePlayback()`.
 * All child components receive props — they have zero Redux dependencies.
 * This makes every sub-component trivially unit-testable.
 *
 * ### Keyboard shortcuts
 * Registered inside `usePlayback()`, not here.  Space/Arrows work regardless
 * of which element has focus (provided it is not inside an input or Monaco).
 */

import React from "react";
import { usePlayback } from "../hooks/usePlayback";
import Timeline from "./Timeline";
import PlaybackSlider from "./PlaybackSlider";
import StepCounter from "./StepCounter";
import SpeedSelector from "./SpeedSelector";
import type { PlaybackSpeed } from "../store/playback/playbackSlice";

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconPrev() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M4 5a1 1 0 011 1v8a1 1 0 01-2 0V6a1 1 0 011-1zm3.763 1.43a1 1 0 011.474-.874l6 3a1 1 0 010 1.748l-6 3A1 1 0 018 13V7a1 1 0 01-.237-.57z" />
    </svg>
  );
}
function IconNext() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M16 5a1 1 0 00-1 1v8a1 1 0 002 0V6a1 1 0 00-1-1zm-3.763 1.43a1 1 0 00-1.474-.874l-6 3a1 1 0 000 1.748l6 3A1 1 0 0012 13V7a1 1 0 00.237-.57z" />
    </svg>
  );
}
function IconPlay() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M6.3 2.84A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.27l9.344-5.891a1.5 1.5 0 000-2.538L6.3 2.84z" clipRule="evenodd" />
    </svg>
  );
}
function IconPause() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zm6.5 0a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z" />
    </svg>
  );
}
function IconStop() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm5-2.25A.75.75 0 017.75 7h4.5a.75.75 0 01.75.75v4.5a.75.75 0 01-.75.75h-4.5a.75.75 0 01-.75-.75v-4.5z" clipRule="evenodd" />
    </svg>
  );
}
function IconRestart() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.389zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
    </svg>
  );
}

// ─── Transport button ─────────────────────────────────────────────────────────

interface TransportButtonProps {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  label: string;
  children: React.ReactNode;
}

const TransportButton = React.memo(function TransportButton({
  onClick,
  disabled = false,
  active = false,
  label,
  children,
}: TransportButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`
        flex items-center justify-center w-8 h-8 rounded-lg border text-sm
        transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-teal-400
        disabled:opacity-40 disabled:cursor-not-allowed
        ${active
          ? "bg-teal-600 border-teal-500 text-white shadow shadow-teal-500/30"
          : "bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white hover:bg-slate-700"
        }
      `}
    >
      {children}
    </button>
  );
});

// ─── PlaybackController ───────────────────────────────────────────────────────

const PlaybackController = React.memo(function PlaybackController() {
  const {
    currentStep,
    snapshotCount,
    isPlaying,
    speed,
    initialized,
    isAtEnd,
    isAtStart,
    currentSnapshot,
    play,
    pause,
    next,
    previous,
    stop,
    restart,
    jumpTo,
    setSpeed,
  } = usePlayback();

  const disabled = !initialized;

  return (
    <div
      className="
        flex flex-col gap-3 px-4 py-3
        bg-slate-950/80 backdrop-blur border-t border-slate-800
      "
      role="toolbar"
      aria-label="Playback controls"
    >
      {/* ── Row 1: Timeline ─────────────────────────────────────────── */}
      <Timeline
        currentStep={currentStep}
        snapshotCount={snapshotCount}
        onJumpTo={jumpTo}
        disabled={disabled}
      />

      {/* ── Row 2: Slider ───────────────────────────────────────────── */}
      <PlaybackSlider
        currentStep={currentStep}
        snapshotCount={snapshotCount}
        onChange={jumpTo}
        disabled={disabled}
      />

      {/* ── Row 3: Transport + counter + speed ──────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Transport buttons */}
        <div className="flex items-center gap-1" role="group" aria-label="Transport controls">
          <TransportButton
            onClick={previous}
            disabled={disabled || isAtStart}
            label="Previous step (←)"
          >
            <IconPrev />
          </TransportButton>

          <TransportButton
            onClick={isPlaying ? pause : play}
            disabled={disabled || (isAtEnd && !isPlaying)}
            active={isPlaying}
            label={isPlaying ? "Pause (Space)" : "Play (Space)"}
          >
            {isPlaying ? <IconPause /> : <IconPlay />}
          </TransportButton>

          <TransportButton
            onClick={next}
            disabled={disabled || isAtEnd}
            label="Next step (→)"
          >
            <IconNext />
          </TransportButton>

          <TransportButton
            onClick={stop}
            disabled={disabled}
            label="Stop (return to start)"
          >
            <IconStop />
          </TransportButton>

          <TransportButton
            onClick={restart}
            disabled={disabled}
            label="Restart"
          >
            <IconRestart />
          </TransportButton>
        </div>

        {/* Step counter */}
        <div className="ml-2">
          <StepCounter
            currentStep={currentStep}
            snapshotCount={snapshotCount}
            line={currentSnapshot?.line}
          />
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Speed selector */}
        <SpeedSelector
          speed={speed}
          onChange={setSpeed as (s: PlaybackSpeed) => void}
          disabled={disabled}
        />
      </div>

      {/* ── Empty state hint ────────────────────────────────────────── */}
      {!initialized && (
        <p className="text-center text-xs text-slate-600 italic">
          Run your code to enable playback
        </p>
      )}
    </div>
  );
});

export default PlaybackController;
