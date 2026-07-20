import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { VariableVisualization } from "../../analysis/models/visualization";
import type { VisualizerProps } from "../VisualizationRegistry";
import { GLASS_CARD, GLASS_HEADER, displayValue } from "../shared/tokens";
import { FADE_IN } from "../ArrayVisualizer/animations";

type Props = VisualizerProps<VariableVisualization[]>;

/**
 * VariableInspector
 *
 * Displays all primitive variables in scope.
 * Variables whose value changed since the last render briefly flash amber.
 * Pointer-flagged variables (e.g. `left`, `i`) are shown with a subtle badge.
 */
const VariableInspector = React.memo(function VariableInspector({ data }: Props) {
  if (!data.length) return null;

  return (
    <motion.div layout {...FADE_IN} className={`${GLASS_CARD} p-4`}>
      <div className={GLASS_HEADER}>Variables</div>
      <div className="flex flex-col gap-1">
        <AnimatePresence mode="popLayout">
          {data.map((variable) => (
            <VariableRow key={variable.name} variable={variable} />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

// ─── Individual variable row ───────────────────────────────────────────────────

const VariableRow = React.memo(function VariableRow({
  variable,
}: {
  variable: VariableVisualization;
}) {
  const prevValueRef = useRef<string | undefined>(undefined);
  const [flash, setFlash] = useState(false);
  const valStr = displayValue(variable.value);

  useEffect(() => {
    if (prevValueRef.current !== undefined && prevValueRef.current !== valStr) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 600);
      return () => clearTimeout(t);
    }
    prevValueRef.current = valStr;
  }, [valStr]);

  const typeColor: Record<string, string> = {
    number:    "text-sky-400",
    string:    "text-green-400",
    boolean:   "text-amber-400",
    null:      "text-slate-500",
    undefined: "text-slate-600",
    bigint:    "text-violet-400",
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{
        opacity: 1,
        x: 0,
        backgroundColor: flash ? "rgba(245,158,11,0.15)" : "rgba(0,0,0,0)",
      }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: flash ? 0.6 : 0.15 }}
      className="flex items-center justify-between gap-4 px-2 py-1.5 rounded-lg"
    >
      {/* Name */}
      <div className="flex items-center gap-1.5 min-w-0">
        {variable.isPointer && (
          <span
            className="shrink-0 text-[9px] font-bold uppercase tracking-widest text-teal-500 border border-teal-800 rounded px-1"
            title="Index pointer variable"
          >
            ptr
          </span>
        )}
        <span
          className="font-mono text-sm text-slate-200 truncate"
          title={variable.name}
        >
          {variable.name}
        </span>
      </div>

      {/* Type + value */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-slate-600 text-xs font-mono">{variable.dataType}</span>
        <span
          className={`font-mono text-sm font-semibold ${typeColor[variable.dataType] ?? "text-slate-300"}`}
          title={valStr}
        >
          = {valStr}
        </span>
      </div>
    </motion.div>
  );
});

export default VariableInspector;
