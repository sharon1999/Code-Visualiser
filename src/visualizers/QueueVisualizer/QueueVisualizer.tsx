import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { QueueVisualization } from "../../analysis/models/visualization";
import type { VisualizerProps } from "../VisualizationRegistry";
import { GLASS_CARD, GLASS_HEADER, displayValue } from "../shared/tokens";
import { FADE_IN } from "../ArrayVisualizer/animations";

type Props = VisualizerProps<QueueVisualization[]>;

/**
 * QueueVisualizer
 *
 * Renders queues horizontally: Front → [item][item][item] → Rear
 * Enqueue animates in from the right; dequeue slides out to the left.
 */
const QueueVisualizer = React.memo(function QueueVisualizer({ data }: Props) {
  if (!data.length) return null;

  return (
    <div className="flex flex-col gap-4">
      <AnimatePresence mode="popLayout">
        {data.map((queue) => (
          <SingleQueue key={queue.name} queue={queue} />
        ))}
      </AnimatePresence>
    </div>
  );
});

const SingleQueue = React.memo(function SingleQueue({
  queue,
}: {
  queue: QueueVisualization;
}) {
  return (
    <motion.div
      layout
      {...FADE_IN}
      className={`${GLASS_CARD} p-4`}
      role="region"
      aria-label={`Queue: ${queue.name}`}
    >
      <div className={GLASS_HEADER}>
        Queue&nbsp;
        <span className="text-slate-200 normal-case font-mono">{queue.name}</span>
        <span className="ml-2 text-slate-500">({queue.items.length} items)</span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {/* Front label */}
        <span className="shrink-0 text-[10px] text-green-400 font-bold tracking-widest uppercase">
          front
        </span>
        <span className="shrink-0 text-slate-500">→</span>

        {/* Items */}
        <div className="flex items-center gap-1 min-h-[2.75rem]">
          <AnimatePresence mode="popLayout">
            {queue.items.length === 0 && (
              <motion.span {...FADE_IN} className="text-slate-600 text-xs italic">
                empty queue
              </motion.span>
            )}
            {queue.items.map((item, i) => (
              <motion.div
                key={`${queue.name}-${i}`}
                layout
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                className={`
                  flex items-center justify-center w-11 h-11 rounded-lg
                  font-mono text-sm font-semibold border
                  ${i === 0
                    ? "bg-green-600/40 border-green-500 text-green-100"
                    : i === queue.items.length - 1
                      ? "bg-orange-600/30 border-orange-600/50 text-orange-200"
                      : "bg-slate-800/60 border-slate-700 text-slate-200"
                  }
                `}
                title={`position ${i}: ${displayValue(item)}`}
              >
                {displayValue(item, 5)}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Rear label */}
        <span className="shrink-0 text-slate-500">→</span>
        <span className="shrink-0 text-[10px] text-orange-400 font-bold tracking-widest uppercase">
          rear
        </span>
      </div>
    </motion.div>
  );
});

export default QueueVisualizer;
