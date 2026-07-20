/**
 * VisualizerDemo
 *
 * A standalone demo page for the visualization engine.
 * Lets you cycle through sample snapshots to verify all visualizers work.
 *
 * Mount this in App.tsx (or as a route) to see a live preview.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import VisualizationRenderer from "../visualizers/VisualizationRenderer";
import { SAMPLES } from "../visualizers/__tests__/sampleData";
import { FADE_IN } from "../visualizers/ArrayVisualizer/animations";

type SampleKey = keyof typeof SAMPLES;
const SAMPLE_KEYS = Object.keys(SAMPLES) as SampleKey[];

export default function VisualizerDemo() {
  const [selected, setSelected] = useState<SampleKey>("Everything");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur border-b border-slate-800 px-6 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-teal-400 shadow-lg shadow-teal-400/50" />
          <span className="font-semibold text-sm tracking-wide text-slate-200">
            Visualization Engine
          </span>
          <span className="text-slate-600 text-xs ml-1">Phase 7 Demo</span>
        </div>

        {/* Sample selector */}
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {SAMPLE_KEYS.map((key) => (
            <motion.button
              key={key}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSelected(key)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                ${selected === key
                  ? "bg-teal-600 border-teal-500 text-white shadow shadow-teal-500/30"
                  : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                }
              `}
              aria-pressed={selected === key}
            >
              {key}
            </motion.button>
          ))}
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-6 py-8">
        <motion.div
          key={selected}
          {...FADE_IN}
          className="max-w-3xl mx-auto"
        >
          {/* Snapshot metadata */}
          <div className="mb-6 p-3 rounded-lg bg-slate-900/50 border border-slate-800 text-xs font-mono text-slate-500 flex gap-4">
            <span>snapshot #{SAMPLES[selected].snapshotId}</span>
            <span>line {SAMPLES[selected].line}</span>
            <span>{new Date(SAMPLES[selected].timestamp).toISOString()}</span>
          </div>

          <VisualizationRenderer state={SAMPLES[selected]} />
        </motion.div>
      </main>
    </div>
  );
}
