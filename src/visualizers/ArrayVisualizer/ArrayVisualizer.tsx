import React, { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ArrayVisualization } from "../../analysis/models/visualization";
import type { VisualizerProps } from "../VisualizationRegistry";
import ArrayCell from "./ArrayCell";
import { GLASS_CARD, GLASS_HEADER } from "../shared/tokens";
import { FADE_IN } from "./animations";

type Props = VisualizerProps<ArrayVisualization[]>;

/**
 * ArrayVisualizer
 *
 * Renders one card per detected array variable.
 * Each card shows:
 *   - Variable name header
 *   - Horizontally scrollable row of ArrayCells
 *   - Pointer badges above the cell they point to
 *
 * Performance: large arrays (1000+) use a virtual window — only cells within
 * ±50 of any active pointer are rendered at full fidelity; the rest are
 * collapsed to a single "…N more…" pill.
 */
const ArrayVisualizer = React.memo(function ArrayVisualizer({ data }: Props) {
  if (!data.length) return null;

  return (
    <div className="flex flex-col gap-4">
      <AnimatePresence mode="popLayout">
        {data.map((arr) => (
          <SingleArray key={arr.name} arr={arr} />
        ))}
      </AnimatePresence>
    </div>
  );
});

// ─── Per-array card ───────────────────────────────────────────────────────────

const VIRTUAL_WINDOW = 60; // cells around a pointer to render at full fidelity

const SingleArray = React.memo(function SingleArray({
  arr,
}: {
  arr: ArrayVisualization;
}) {
  // Build a set of highlighted indices
  const highlightedSet = useMemo(
    () => new Set(arr.highlighted),
    [arr.highlighted],
  );

  // Build a map: index → pointers that sit there
  const pointersByIndex = useMemo(() => {
    const map = new Map<number, typeof arr.pointers>();
    for (const ptr of arr.pointers) {
      const list = map.get(ptr.index) ?? [];
      list.push(ptr);
      map.set(ptr.index, list);
    }
    return map;
  }, [arr.pointers]);

  // Compute virtual render range
  const { start, end, total } = useMemo(() => {
    const total = arr.values.length;
    if (total <= VIRTUAL_WINDOW) return { start: 0, end: total, total };

    const ptrIndices = arr.pointers.map((p) => p.index);
    const highlightedIndices = arr.highlighted;
    const anchorIndices = [...ptrIndices, ...highlightedIndices, 0];

    const minAnchor = Math.max(0, Math.min(...anchorIndices) - 5);
    const maxAnchor = Math.min(total - 1, Math.max(...anchorIndices) + 5);

    return { start: minAnchor, end: maxAnchor + 1, total };
  }, [arr.values.length, arr.pointers, arr.highlighted]);

  const cells = arr.values.slice(start, end);
  const showLeftEllipsis  = start > 0;
  const showRightEllipsis = end < total;

  return (
    <motion.div
      layout
      {...FADE_IN}
      className={`${GLASS_CARD} p-4`}
      role="region"
      aria-label={`Array: ${arr.name}`}
    >
      <div className={GLASS_HEADER}>
        Array &nbsp;<span className="text-slate-200 normal-case font-mono">{arr.name}</span>
        <span className="ml-2 text-slate-500">({total} elements)</span>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex items-end gap-1 min-w-max">
          {showLeftEllipsis && (
            <EllipsisPill label={`…${start} more`} />
          )}

          <AnimatePresence mode="popLayout">
            {cells.map((value, localIdx) => {
              const globalIdx = start + localIdx;
              return (
                <ArrayCell
                  key={`${arr.name}-${globalIdx}`}
                  index={globalIdx}
                  value={value}
                  isHighlighted={highlightedSet.has(globalIdx)}
                  pointers={pointersByIndex.get(globalIdx) ?? []}
                />
              );
            })}
          </AnimatePresence>

          {showRightEllipsis && (
            <EllipsisPill label={`${total - end} more…`} />
          )}
        </div>
      </div>
    </motion.div>
  );
});

function EllipsisPill({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-3 h-12 text-xs text-slate-500 border border-dashed border-slate-700 rounded-lg">
      {label}
    </div>
  );
}

export default ArrayVisualizer;
