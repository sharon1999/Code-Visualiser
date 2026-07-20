/**
 * VisualizationRenderer
 *
 * The single entry point for the entire visualization engine.
 *
 * Responsibilities:
 *   1. Import registerAll (side-effect: populates the VisualizationRegistry).
 *   2. Query the registry for all visible visualizers for the given state.
 *   3. Render each visualizer in priority order, passing its slice of state.
 *
 * Adding a new visualizer requires ZERO changes here — only in registerAll.ts.
 *
 * Props:
 *   state     — The VisualizationState produced by AlgorithmAnalyzer.
 *   className — Optional extra Tailwind classes for the wrapper.
 *   emptyMessage — Text to show when no visualizers have data.
 */

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { VisualizationState } from "../analysis/models/visualization";
import { VisualizationRegistry } from "./VisualizationRegistry";
// Side-effect: registers all default visualizers
import "./registerAll";
import { FADE_IN } from "./ArrayVisualizer/animations";

interface VisualizationRendererProps {
  state: VisualizationState;
  className?: string;
  emptyMessage?: string;
}

/**
 * VisualizationRenderer
 *
 * Automatically renders every detected data structure from `state` using
 * the registered visualizer for that structure type.
 */
const VisualizationRenderer = React.memo(function VisualizationRenderer({
  state,
  className = "",
  emptyMessage = "Run your code to see visualizations",
}: VisualizationRendererProps) {
  const visibleEntries = VisualizationRegistry.getVisible(state);

  return (
    <div
      className={`flex flex-col gap-5 ${className}`}
      role="main"
      aria-label="Algorithm visualization panel"
    >
      <AnimatePresence mode="popLayout">
        {visibleEntries.length === 0 ? (
          <EmptyState key="empty" message={emptyMessage} />
        ) : (
          visibleEntries.map((entry) => {
            const Component = entry.component;
            const data = state[entry.stateKey];

            return (
              <motion.section
                key={entry.stateKey}
                layout
                {...FADE_IN}
                role="region"
                aria-label={entry.label}
              >
                <Component data={data} />
              </motion.section>
            );
          })
        )}
      </AnimatePresence>
    </div>
  );
});

function EmptyState({ message }: { message: string }) {
  return (
    <motion.div
      {...FADE_IN}
      className="flex flex-col items-center justify-center py-20 gap-4 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center justify-center">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-slate-600"
          aria-hidden="true"
        >
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      </div>
      <p className="text-slate-500 text-sm max-w-[240px] leading-relaxed">
        {message}
      </p>
    </motion.div>
  );
}

export default VisualizationRenderer;
