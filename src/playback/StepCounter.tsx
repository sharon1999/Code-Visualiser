/**
 * StepCounter
 *
 * Displays the current position in the timeline: "15 / 42".
 * Also shows the source line number of the current snapshot when available.
 *
 * Kept deliberately simple — it is a pure display component with no actions.
 */

import React from "react";

interface StepCounterProps {
  currentStep: number;
  snapshotCount: number;
  /** Source line of the current snapshot, if known. */
  line?: number;
}

const StepCounter = React.memo(function StepCounter({
  currentStep,
  snapshotCount,
  line,
}: StepCounterProps) {
  if (snapshotCount === 0) {
    return (
      <span className="text-xs text-slate-500 font-mono tabular-nums">
        — / —
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-300 font-mono tabular-nums">
        <span className="text-teal-400 font-semibold">{currentStep + 1}</span>
        <span className="text-slate-500"> / </span>
        {snapshotCount}
      </span>
      {line !== undefined && (
        <span className="text-xs text-slate-500 font-mono">
          L{line}
        </span>
      )}
    </div>
  );
});

export default StepCounter;
