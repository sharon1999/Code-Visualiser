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

// AlgorithmAnalyzer is stateful (LRU context cache) so we create one module-
// level instance that is shared across renders.
const analyzer = new AlgorithmAnalyzer();

/**
 * Right sidebar — hosts the live Visualization Engine.
 *
 * When a playback snapshot is available the analyzer converts it to a
 * VisualizationState and feeds it to VisualizationRenderer.
 * Before any code has been run the static SAMPLE_FULL demo is shown so the
 * panel is never empty on first load.
 */
const Sidebar: React.FC<SidebarProps> = ({ title, side }) => {
  if (side === 'right') {
    const snapshot = useSelector(selectCurrentSnapshot);
    const initialized = useSelector(selectInitialized);

    // If we have a live snapshot, analyse it; otherwise fall back to the demo.
    const vizState = React.useMemo(() => {
      if (snapshot) {
        return analyzer.analyze(snapshot);
      }
      return SAMPLE_FULL;
    }, [snapshot]);

    return (
      <div className="h-full bg-slate-950 border-l border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-10 flex items-center gap-2 px-4 border-b border-slate-800 bg-slate-900/50 shrink-0">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex-1">
            Visualizations
          </h2>
          {initialized && (
            <span className="text-[10px] text-teal-400 font-mono">
              live
            </span>
          )}
          {!initialized && (
            <span className="text-[10px] text-slate-600 font-mono italic">
              demo
            </span>
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
  }

  return (
    <div className={`h-full bg-card border-border flex flex-col ${side === 'left' ? 'border-r' : 'border-l'}`}>
      <div className="h-10 flex items-center px-4 border-b border-border bg-muted/30">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</h2>
      </div>
      <div className="flex-1 p-4 flex items-center justify-center">
        <p className="text-sm text-muted-foreground text-center">
          {title} area<br/>
          <span className="text-xs opacity-50">(Coming soon)</span>
        </p>
      </div>
    </div>
  );
};

export default Sidebar;
