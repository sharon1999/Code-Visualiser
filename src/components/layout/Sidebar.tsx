import React from 'react';
import { useSelector } from 'react-redux';
import VisualizationRenderer from '../../visualizers/VisualizationRenderer';
import { selectCurrentSnapshot, selectInitialized } from '../../store/playback/selectors';
import { AlgorithmAnalyzer } from '../../analysis/analyzer/AlgorithmAnalyzer';
import { SAMPLE_FULL } from '../../visualizers/__tests__/sampleData';

interface SidebarProps {
  title: string;
  side: 'left' | 'right';
}

// ─── Module-level analyzer (shared LRU cache across renders) ──────────────────
const analyzer = new AlgorithmAnalyzer();

// ─── Right panel (visualization) ─────────────────────────────────────────────

/**
 * Hooks are called unconditionally here — this component is only ever mounted
 * when `side === 'right'`, so the Rules of Hooks are satisfied.
 */
const RightPanel: React.FC = () => {
  // These hooks are always at the top level — no conditional calls.
  const snapshot = useSelector(selectCurrentSnapshot);
  const initialized = useSelector(selectInitialized);

  const vizState = React.useMemo(() => {
    if (snapshot) return analyzer.analyze(snapshot);
    return SAMPLE_FULL;
  }, [snapshot]);

  return (
    <div className="h-full bg-slate-950 border-l border-slate-800 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-10 flex items-center gap-2 px-4 border-b border-slate-800 bg-slate-900/50 shrink-0">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex-1">
          Visualizations
        </h2>
        {initialized ? (
          <span className="text-[10px] text-teal-400 font-mono">live</span>
        ) : (
          <span className="text-[10px] text-slate-600 font-mono italic">demo</span>
        )}
      </div>

      {/* Scrollable visualization panel */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <VisualizationRenderer
          state={vizState}
          emptyMessage="Run code to see visualizations"
        />
      </div>
    </div>
  );
};

// ─── Left panel (placeholder) ─────────────────────────────────────────────────

const LeftPanel: React.FC<{ title: string }> = ({ title }) => (
  <div className="h-full bg-card border-r border-border flex flex-col">
    <div className="h-10 flex items-center px-4 border-b border-border bg-muted/30">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h2>
    </div>
    <div className="flex-1 p-4 flex items-center justify-center">
      <p className="text-sm text-muted-foreground text-center">
        {title} area<br />
        <span className="text-xs opacity-50">(Coming soon)</span>
      </p>
    </div>
  </div>
);

// ─── Router ───────────────────────────────────────────────────────────────────

/**
 * Sidebar renders the correct panel based on `side`.
 * Hooks are never called conditionally — each sub-component owns its own hooks.
 */
const Sidebar: React.FC<SidebarProps> = ({ title, side }) => {
  if (side === 'right') return <RightPanel />;
  return <LeftPanel title={title} />;
};

export default Sidebar;
