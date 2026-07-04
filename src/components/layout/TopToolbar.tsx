import React from 'react';
import { Play, StepForward, RotateCcw } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/storeHooks';
import {
  setIsRunning,
  resetCode,
  setAst,
  appendLog,
  clearConsoleLogs,
  clearAst,
} from '../../store/editorSlice';
import { parseCode } from '../../services/parser';

const TopToolbar: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isRunning, code } = useAppSelector((state) => state.editor);

  const handleRun = () => {
    // Clear previous state before re-parsing.
    dispatch(clearConsoleLogs());
    dispatch(clearAst());
    dispatch(setIsRunning(true));

    dispatch(appendLog({ level: 'info', message: 'Parsing code…' }));

    const result = parseCode(code);

    if (result.success) {
      dispatch(setAst(result.ast));
      dispatch(setIsRunning(false));
    } else {
      const { message, line, column } = result.error;
      const location =
        line != null
          ? ` (line ${line}${column != null ? `, col ${column}` : ''})`
          : '';

      dispatch(
        appendLog({
          level: 'error',
          message: `SyntaxError${location}: ${message}`,
        }),
      );
      dispatch(setIsRunning(false));
    }
  };

  const handleReset = () => {
    dispatch(resetCode());
  };

  return (
    <div className="h-12 border-b border-border bg-card flex items-center px-4 justify-between">
      <div className="flex items-center space-x-4">
        <h1 className="text-sm font-semibold text-foreground tracking-wide">DSA Visualizer</h1>
      </div>

      <div className="flex items-center space-x-2">
        <button
          id="btn-run"
          onClick={handleRun}
          disabled={isRunning}
          className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            isRunning
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-green-600/20 text-green-500 hover:bg-green-600/30'
          }`}
        >
          <Play size={16} className="mr-1.5" />
          Run
        </button>

        <button
          id="btn-step"
          disabled={!isRunning}
          className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            !isRunning
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-blue-600/20 text-blue-500 hover:bg-blue-600/30'
          }`}
        >
          <StepForward size={16} className="mr-1.5" />
          Step
        </button>

        <div className="w-px h-5 bg-border mx-1" />

        <button
          id="btn-reset"
          onClick={handleReset}
          className="flex items-center px-3 py-1.5 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
        >
          <RotateCcw size={16} className="mr-1.5" />
          Reset
        </button>
      </div>

      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <span>Settings</span>
      </div>
    </div>
  );
};

export default TopToolbar;
