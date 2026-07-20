import React from "react";
import { motion } from "framer-motion";
import type { ArrayPointer } from "../../analysis/models/visualization";
import { getPointerClasses, getPointerDotClass, displayValue } from "../shared/tokens";
import { FADE_IN, POINTER_SPRING } from "./animations";

interface ArrayCellProps {
  index: number;
  value: unknown;
  isHighlighted: boolean;
  /** Pointers anchored to this cell. */
  pointers: ArrayPointer[];
}

/**
 * A single array element cell.
 *
 * Renders:
 *  - Pointer labels above (or stacked when multiple hit same index)
 *  - The value
 *  - The index label below
 *
 * Memoised so the full array doesn't re-render when only one cell changes.
 */
const ArrayCell = React.memo(function ArrayCell({
  index,
  value,
  isHighlighted,
  pointers,
}: ArrayCellProps) {
  const hasPointers = pointers.length > 0;

  return (
    <div className="flex flex-col items-center">
      {/* ── Pointer badges above ────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-0.5 mb-1 min-h-[1.5rem]">
        {hasPointers &&
          pointers.map((ptr) => (
            <motion.div
              key={ptr.name}
              layout
              layoutId={`ptr-${ptr.name}`}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={POINTER_SPRING}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${getPointerClasses(ptr.name)}`}
              title={`${ptr.name} = ${index}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${getPointerDotClass(ptr.name)}`} />
              {ptr.name}
            </motion.div>
          ))}
      </div>

      {/* ── Cell body ───────────────────────────────────────────────── */}
      <motion.div
        layout
        className={`
          relative w-12 h-12 flex items-center justify-center
          border rounded-lg text-sm font-mono font-semibold
          transition-colors duration-200 select-none
          ${isHighlighted
            ? "bg-amber-500/30 border-amber-400 text-amber-200 shadow-lg shadow-amber-500/20"
            : "bg-slate-800/80 border-slate-600 text-slate-100 hover:border-slate-400"
          }
        `}
        whileHover={{ scale: 1.05 }}
        aria-label={`index ${index}, value ${displayValue(value)}`}
        title={`[${index}] = ${displayValue(value)}`}
      >
        {displayValue(value, 6)}
      </motion.div>

      {/* ── Index label below ────────────────────────────────────────── */}
      <span className="mt-1 text-[10px] text-slate-500 font-mono">{index}</span>
    </div>
  );
});

export default ArrayCell;
