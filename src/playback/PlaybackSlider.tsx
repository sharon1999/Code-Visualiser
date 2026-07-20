/**
 * PlaybackSlider
 *
 * A thin wrapper around a native <input type="range"> that maps the 0-based
 * snapshot index to a [0, snapshotCount-1] range.
 *
 * ### Why native range, not a custom SVG slider?
 * Native range inputs are natively accessible (keyboard, screenreader),
 * receive focus correctly, and the browser handles drag gestures on mobile.
 * We style it with CSS to match the dark glassmorphism theme.
 */

import React, { useCallback } from "react";

interface PlaybackSliderProps {
  currentStep: number;
  snapshotCount: number;
  /** Called with the new 0-based step index when the user drags or clicks. */
  onChange: (step: number) => void;
  disabled?: boolean;
}

const PlaybackSlider = React.memo(function PlaybackSlider({
  currentStep,
  snapshotCount,
  onChange,
  disabled = false,
}: PlaybackSliderProps) {
  const max = Math.max(0, snapshotCount - 1);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(Number(e.target.value));
    },
    [onChange],
  );

  return (
    <input
      type="range"
      min={0}
      max={max}
      value={currentStep}
      step={1}
      onChange={handleChange}
      disabled={disabled || snapshotCount === 0}
      aria-label="Playback position"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={currentStep}
      aria-valuetext={`Step ${currentStep + 1} of ${snapshotCount}`}
      className="
        w-full h-1.5 rounded-full appearance-none cursor-pointer
        bg-slate-700
        [&::-webkit-slider-thumb]:appearance-none
        [&::-webkit-slider-thumb]:w-4
        [&::-webkit-slider-thumb]:h-4
        [&::-webkit-slider-thumb]:rounded-full
        [&::-webkit-slider-thumb]:bg-teal-400
        [&::-webkit-slider-thumb]:shadow-lg
        [&::-webkit-slider-thumb]:shadow-teal-500/40
        [&::-webkit-slider-thumb]:border-2
        [&::-webkit-slider-thumb]:border-slate-900
        [&::-webkit-slider-thumb]:transition-transform
        [&::-webkit-slider-thumb]:hover:scale-125
        [&::-moz-range-thumb]:w-4
        [&::-moz-range-thumb]:h-4
        [&::-moz-range-thumb]:rounded-full
        [&::-moz-range-thumb]:bg-teal-400
        [&::-moz-range-thumb]:border-2
        [&::-moz-range-thumb]:border-slate-900
        disabled:opacity-40 disabled:cursor-not-allowed
        accent-teal-400
      "
      style={{
        backgroundImage: `linear-gradient(to right, rgb(20 184 166) 0%, rgb(20 184 166) ${(currentStep / Math.max(1, max)) * 100}%, rgb(51 65 85) ${(currentStep / Math.max(1, max)) * 100}%, rgb(51 65 85) 100%)`,
      }}
    />
  );
});

export default PlaybackSlider;
