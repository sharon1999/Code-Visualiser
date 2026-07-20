import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { HashMapVisualization } from "../../analysis/models/visualization";
import type { VisualizerProps } from "../VisualizationRegistry";
import { GLASS_CARD, GLASS_HEADER, displayValue } from "../shared/tokens";
import { FADE_IN, SLIDE_UP } from "../ArrayVisualizer/animations";

type Props = VisualizerProps<HashMapVisualization[]>;

/**
 * HashMapVisualizer
 *
 * Renders each hash map as a two-column table (Key | Value).
 * Entries animate in on insertion and fade out on removal.
 * Distinguishes JS Map instances from plain-object maps with a badge.
 */
const HashMapVisualizer = React.memo(function HashMapVisualizer({ data }: Props) {
  if (!data.length) return null;

  return (
    <div className="flex flex-col gap-4">
      <AnimatePresence mode="popLayout">
        {data.map((hm) => (
          <SingleHashMap key={hm.name} hm={hm} />
        ))}
      </AnimatePresence>
    </div>
  );
});

const SingleHashMap = React.memo(function SingleHashMap({
  hm,
}: {
  hm: HashMapVisualization;
}) {
  return (
    <motion.div
      layout
      {...FADE_IN}
      className={`${GLASS_CARD} p-4`}
      role="region"
      aria-label={`HashMap: ${hm.name}`}
    >
      <div className={GLASS_HEADER}>
        HashMap&nbsp;
        <span className="text-slate-200 normal-case font-mono">{hm.name}</span>
        <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-violet-900/50 border border-violet-700 text-violet-300">
          {hm.kind}
        </span>
      </div>

      {hm.entries.length === 0 ? (
        <p className="text-slate-500 text-xs italic">empty</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left text-xs text-slate-500 font-medium pb-2 pr-4 border-b border-slate-700">
                  Key
                </th>
                <th className="text-left text-xs text-slate-500 font-medium pb-2 border-b border-slate-700">
                  Value
                </th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {hm.entries.map((entry) => {
                  const keyStr = displayValue(entry.key);
                  const valStr = displayValue(entry.value);
                  return (
                    <motion.tr
                      key={keyStr}
                      layout
                      {...SLIDE_UP}
                      className="group"
                    >
                      <td className="py-1.5 pr-4 font-mono text-teal-300 border-b border-slate-800 group-last:border-0">
                        {keyStr}
                      </td>
                      <td className="py-1.5 font-mono text-amber-200 border-b border-slate-800 group-last:border-0">
                        {valStr}
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
});

export default HashMapVisualizer;
