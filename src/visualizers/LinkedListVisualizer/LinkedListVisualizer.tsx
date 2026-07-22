import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { LinkedListVisualization } from "../../analysis/models/visualization";
import type { VisualizerProps } from "../VisualizationRegistry";
import { GLASS_CARD, GLASS_HEADER, displayValue } from "../shared/tokens";
import { FADE_IN } from "../ArrayVisualizer/animations";

type Props = VisualizerProps<LinkedListVisualization[]>;

/**
 * LinkedListVisualizer
 *
 * Renders: head → [1] → [2] → [3] → null
 * Head node is highlighted in cyan, tail in purple.
 * A cycle badge appears when `hasCycle` is true.
 */
const LinkedListVisualizer = React.memo(function LinkedListVisualizer({
  data,
}: Props) {
  if (!data.length) return null;

  return (
    <div className="flex flex-col gap-4">
      <AnimatePresence mode="popLayout">
        {data.map((ll) => (
          <SingleLinkedList key={ll.name} ll={ll} />
        ))}
      </AnimatePresence>
    </div>
  );
});

const SingleLinkedList = React.memo(function SingleLinkedList({
  ll,
}: {
  ll: LinkedListVisualization;
}) {
  return (
    <motion.div
      layout
      {...FADE_IN}
      className={`${GLASS_CARD} p-4`}
      role="region"
      aria-label={`Linked List: ${ll.name}`}
    >
      <div className={GLASS_HEADER}>
        Linked List&nbsp;
        <span className="text-slate-200 normal-case font-mono">{ll.name}</span>
        <span className="ml-2 text-slate-500">({ll.nodes.length} nodes)</span>
        {ll.hasCycle && (
          <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-red-900/60 border border-red-600 text-red-300">
            cycle detected
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pb-2 flex-wrap">
        {/* Head pointer */}
        <span className="shrink-0 text-[10px] text-cyan-400 font-bold uppercase tracking-widest mr-1">
          head
        </span>
        <Arrow />

        {/* Nodes */}
        <AnimatePresence mode="popLayout">
          {ll.nodes.map((node, i) => {
            const isHead = i === 0;
            const isTail = i === ll.nodes.length - 1;
            return (
              // Wrap node + arrow in a keyed flex container.
              // AnimatePresence requires the key on the outermost element;
              // React.Fragment no longer accepts key as a prop in React 19.
              <div key={node.heapRef} className="flex items-center gap-1">
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  className="relative flex flex-col items-center"
                >
                  {/* Position label */}
                  {(isHead || isTail) && (
                    <span
                      className={`
                        absolute -top-5 text-[9px] font-bold tracking-widest uppercase
                        ${isHead ? "text-cyan-400" : "text-purple-400"}
                      `}
                    >
                      {isHead ? "head" : "tail"}
                    </span>
                  )}

                  <div
                    className={`
                      w-12 h-12 flex items-center justify-center rounded-lg
                      font-mono text-sm font-semibold border
                      ${isHead
                        ? "bg-cyan-600/40 border-cyan-500 text-cyan-100"
                        : isTail
                          ? "bg-purple-600/40 border-purple-500 text-purple-100"
                          : "bg-slate-800/70 border-slate-600 text-slate-200"
                      }
                    `}
                    title={`node[${node.index}] = ${displayValue(node.value)}`}
                  >
                    {displayValue(node.value, 5)}
                  </div>
                </motion.div>

                {/* Arrow between nodes */}
                {i < ll.nodes.length - 1 && <Arrow />}
              </div>
            );
          })}
        </AnimatePresence>

        {/* Null / cycle tail */}
        <Arrow />
        {ll.hasCycle ? (
          <span className="text-red-400 font-mono text-sm">↩ cycle</span>
        ) : (
          <span className="text-slate-500 font-mono text-sm">null</span>
        )}
      </div>
    </motion.div>
  );
});

function Arrow() {
  return (
    <span className="shrink-0 text-slate-500 font-mono text-lg leading-none select-none">
      →
    </span>
  );
}

export default LinkedListVisualizer;
