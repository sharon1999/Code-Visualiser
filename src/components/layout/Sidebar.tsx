import React from 'react';

interface SidebarProps {
  title: string;
  side: 'left' | 'right';
}

const Sidebar: React.FC<SidebarProps> = ({ title, side }) => {
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
