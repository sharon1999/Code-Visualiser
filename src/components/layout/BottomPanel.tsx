import React from 'react';
import { Terminal } from 'lucide-react';

const BottomPanel: React.FC = () => {
  return (
    <div className="h-48 border-t border-border bg-card flex flex-col">
      <div className="h-10 flex items-center px-4 border-b border-border bg-muted/30">
        <Terminal size={14} className="mr-2 text-muted-foreground" />
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Console</h2>
      </div>
      <div className="flex-1 p-4 overflow-y-auto font-mono text-sm text-muted-foreground">
        &gt; Ready...
      </div>
    </div>
  );
};

export default BottomPanel;
