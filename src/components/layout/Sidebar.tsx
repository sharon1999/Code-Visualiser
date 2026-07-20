import React from 'react';
import VisualizationRenderer from '../../visualizers/VisualizationRenderer';
import { SAMPLE_FULL } from '../../visualizers/__tests__/sampleData';

interface SidebarProps {
  title: string;
  side: 'left' | 'right';
}

/**
 * Sidebar — Left holds test-case list; Right hosts the Visualization Engine.
 *
 * The right sidebar renders a live `VisualizationRenderer` fed with sample data.
 * When execution playback is added (Phase 8) the state prop will come from
 * the Redux store / snapshot recorder instead of the static sample.
 */
const Sidebar: React.FC<SidebarProps> = ({ title, side }) => {
  if (side === 'right') {
    return (
      <div className="h-full bg-slate-950 border-l border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-10 flex items-center px-4 border-b border-slate-800 bg-slate-900/50 shrink-0">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Visualizations
          </h2>
        </div>
        {/* Scrollable visualization panel */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <VisualizationRenderer
            state={SAMPLE_FULL}
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
