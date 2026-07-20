import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { StackVisualization } from "../../analysis/models/visualization";
import type { VisualizerProps } from "../VisualizationRegistry";
import { GLASS_CARD, GLASS_HEADER, displayValue } from "../shared/tokens";
import { FADE_IN } from "../ArrayVisualizer/animations";

type Props = VisualizerProps<StackVisualization[]>;

/**
 * StackVisualizer
 *
 * Renders stacks vertically with the top element at the top.
 * Elements push in from the top and pop out upward.
 * A subtle gradient background deepens as the stack grows.
 */
const StackVisualizer = React.memo(function StackVisualizer({ data }: Props) {
  if (!data.length) return null;

  return (
    <div className="flex flex-col gap-4">
      <AnimatePresence mode="popLayout">
        {data.map((stack) => (
          <SingleStack key={stack.name} stack={stack} />
        ))}
      </AnimatePresence>
    </div>
  );
});

const SingleStack = React.memo(function SingleStack({
  stack,
}: {
  stack: StackVisualization;
}) {
  // Items displayed top-to-bottom = stack reversed (top of stack first)
  const reversed = [...stack.items].reverse();

  return (
    <motion.div
      layout
      {...FADE_IN}
      className={`${GLASS_CARD} p-4`}
      role="region"
      aria-label={`Stack: ${stack.name}`}
    >
      <div className={GLASS_HEADER}>
        Stack&nbsp;
        <span className="text-slate-200 normal-case font-mono">{stack.name}</span>
        <span className="ml-2 text-slate-500">({stack.items.length} items)</span>
      </div>

      {/* TOP label */}
      {stack.items.length > 0 && (
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] text-teal-400 font-semibold tracking-widest uppercase">
            top
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-teal-500/50 to-transparent" />
        </div>
      )}

      <div className="flex flex-col gap-1 min-h-[2rem]">
        <AnimatePresence mode="popLayout">
          {reversed.map((item, i) => (
            <motion.div
              key={`${stack.name}-${reversed.length - 1 - i}`}
              layout
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
              className={`
                flex items-center justify-center h-10 rounded-lg
                font-mono text-sm font-semibold border
                ${i === 0
                  ? "bg-teal-600/40 border-teal-500 text-teal-100"
                  : "bg-slate-800/60 border-slate-700 text-slate-200"
                }
              `}
              title={`depth ${i}: ${displayValue(item)}`}
            >
              {displayValue(item, 24)}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* BOTTOM label */}
      {stack.items.length > 0 && (
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-px bg-gradient-to-r from-slate-700 to-transparent" />
          <span className="text-[10px] text-slate-500 font-semibold tracking-widest uppercase">
            bottom
          </span>
        </div>
      )}

      {stack.items.length === 0 && (
        <p className="text-slate-600 text-xs italic text-center py-4">empty stack</p>
      )}
    </motion.div>
  );
});

export default StackVisualizer;
