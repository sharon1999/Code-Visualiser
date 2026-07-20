/**
 * Timeline
 *
 * A visual debugger timeline that shows all snapshot positions as dots
 * connected by a progress track, with the current position highlighted.
 *
 * ### Architecture
 *
 * For 10 000+ snapshots, rendering one DOM node per snapshot would destroy
 * performance.  Instead, the Timeline:
 *
 *   1. Renders the track as a single `<div>` with a CSS gradient for the fill.
 *   2. Renders the slider thumb at the correct fractional position.
 *   3. Renders **at most `MAX_VISIBLE_DOTS`** evenly-sampled snapshot dots.
 *      For small timelines all dots are shown; for large ones a subset is shown.
 *   4. Clicking anywhere on the track calculates the target step from the
 *      click's fractional position and calls `onJumpTo`.
 *
 * This keeps the DOM size O(MAX_VISIBLE_DOTS) regardless of timeline length.
 */

import React, { useCallback, useRef } from "react";
import { motion } from "framer-motion";

const MAX_VISIBLE_DOTS = 60;

interface TimelineProps {
  currentStep: number;
  snapshotCount: number;
  onJumpTo: (step: number) => void;
  disabled?: boolean;
}

const Timeline = React.memo(function Timeline({
  currentStep,
  snapshotCount,
  onJumpTo,
  disabled = false,
}: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const progress = snapshotCount > 1 ? currentStep / (snapshotCount - 1) : 0;

  // ── Click-to-jump ──────────────────────────────────────────────────────
  const handleTrackClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled || snapshotCount === 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const fraction = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const step = Math.round(fraction * (snapshotCount - 1));
      onJumpTo(step);
    },
    [disabled, snapshotCount, onJumpTo],
  );

  // ── Sample dots ────────────────────────────────────────────────────────
  const dotIndices: number[] = React.useMemo(() => {
    if (snapshotCount === 0) return [];
    if (snapshotCount <= MAX_VISIBLE_DOTS) {
      return Array.from({ length: snapshotCount }, (_, i) => i);
    }
    // Sample evenly
    const step = (snapshotCount - 1) / (MAX_VISIBLE_DOTS - 1);
    return Array.from({ length: MAX_VISIBLE_DOTS }, (_, i) =>
      Math.round(i * step),
    );
  }, [snapshotCount]);

  if (snapshotCount === 0) {
    return (
      <div className="flex items-center gap-2 opacity-30 pointer-events-none select-none">
        <div className="flex-1 h-1 bg-slate-700 rounded-full" />
      </div>
    );
  }

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-label="Execution timeline"
      aria-valuenow={currentStep + 1}
      aria-valuemin={1}
      aria-valuemax={snapshotCount}
      aria-valuetext={`Step ${currentStep + 1} of ${snapshotCount}`}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") onJumpTo(Math.min(currentStep + 1, snapshotCount - 1));
        if (e.key === "ArrowLeft") onJumpTo(Math.max(currentStep - 1, 0));
      }}
      onClick={handleTrackClick}
      className={`
        relative flex items-center h-8 cursor-pointer select-none group
        ${disabled ? "opacity-40 cursor-not-allowed pointer-events-none" : ""}
      `}
    >
      {/* ── Track background ─────────────────────────────────────────── */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 bg-slate-700 rounded-full">
        {/* ── Progress fill ──────────────────────────────────────────── */}
        <motion.div
          className="h-full bg-gradient-to-r from-teal-600 to-teal-400 rounded-full origin-left"
          style={{ scaleX: progress }}
          transition={{ type: "spring", stiffness: 600, damping: 40 }}
        />
      </div>

      {/* ── Dots ─────────────────────────────────────────────────────── */}
      <div className="relative w-full h-full">
        {dotIndices.map((dotStep) => {
          const fraction = (snapshotCount > 1) ? dotStep / (snapshotCount - 1) : 0;
          const isCurrent = dotStep === currentStep;
          const isPast = dotStep < currentStep;
          return (
            <button
              key={dotStep}
              onClick={(e) => {
                e.stopPropagation();
                onJumpTo(dotStep);
              }}
              aria-label={`Jump to step ${dotStep + 1}`}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-teal-400"
              style={{ left: `${fraction * 100}%` }}
            >
              <div
                className={`rounded-full transition-all duration-150 ${
                  isCurrent
                    ? "w-3.5 h-3.5 bg-teal-300 shadow-lg shadow-teal-400/60 ring-2 ring-teal-400/40"
                    : isPast
                      ? "w-1.5 h-1.5 bg-teal-600 group-hover:w-2 group-hover:h-2"
                      : "w-1.5 h-1.5 bg-slate-600 group-hover:w-2 group-hover:h-2"
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
});

export default Timeline;
