import React from 'react';
import TopToolbar from './TopToolbar';
import Sidebar from './Sidebar';
import BottomPanel from './BottomPanel';
import CodeEditor from '../editor/CodeEditor';
import PlaybackController from '../../playback/PlaybackController';

const MainLayout: React.FC = () => {
  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden">
      <TopToolbar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar */}
          <div className="w-64 flex-shrink-0 hidden md:block">
            <Sidebar title="Test Cases" side="left" />
          </div>

          {/* Center Editor */}
          <div className="flex-1 min-w-0 flex flex-col bg-[#1e1e1e]">
            <CodeEditor />
          </div>

          {/* Right Sidebar — Visualization Engine */}
          <div className="w-80 flex-shrink-0 hidden lg:block">
            <Sidebar title="Visualizations" side="right" />
          </div>
        </div>

        {/* Playback Controller — sits between editor and console */}
        <PlaybackController />

        {/* Bottom Console Panel */}
        <BottomPanel />
      </div>
    </div>
  );
};

export default MainLayout;
