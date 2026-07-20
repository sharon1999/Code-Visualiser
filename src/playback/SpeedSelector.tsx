/**
 * SpeedSelector
 *
 * Renders a row of speed buttons: 0.25× 0.5× 1× 2× 4× 8×
 * The active speed is highlighted.
 *
 * Design decision: buttons instead of a <select> because the set of valid
 * values is small (6 items) and the UI is more scannable as individual chips.
 */

import React from "react";
import { PLAYBACK_SPEEDS } from "../store/playback/playbackSlice";
import type { PlaybackSpeed } from "../store/playback/playbackSlice";

interface SpeedSelectorProps {
  speed: number;
  onChange: (speed: PlaybackSpeed) => void;
  disabled?: boolean;
}

const SpeedSelector = React.memo(function SpeedSelector({
  speed,
  onChange,
  disabled = false,
}: SpeedSelectorProps) {
  return (
    <div
      role="group"
      aria-label="Playback speed"
      className="flex items-center gap-1"
    >
      {PLAYBACK_SPEEDS.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          disabled={disabled}
          aria-pressed={speed === s}
          aria-label={`${s}× speed`}
          className={`
            px-2 py-1 rounded text-[10px] font-semibold tabular-nums
            border transition-all duration-150
            disabled:opacity-40 disabled:cursor-not-allowed
            ${speed === s
              ? "bg-teal-600 border-teal-500 text-white shadow shadow-teal-500/30"
              : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
            }
          `}
        >
          {s}×
        </button>
      ))}
    </div>
  );
});

export default SpeedSelector;
