import React from 'react';
import TopToolbar from './TopToolbar';
import Sidebar from './Sidebar';
import BottomPanel from './BottomPanel';
import CodeEditor from '../editor/CodeEditor';

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
          
          {/* Right Sidebar */}
          <div className="w-80 flex-shrink-0 hidden lg:block">
            <Sidebar title="Variables & Call Stack" side="right" />
          </div>
        </div>
        
        {/* Bottom Panel */}
        <BottomPanel />
      </div>
    </div>
  );
};

export default MainLayout;
