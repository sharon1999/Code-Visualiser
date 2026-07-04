import React, { useEffect, useRef } from 'react';
import { Terminal, Trash2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../hooks/storeHooks';
import { clearConsoleLogs } from '../../store/editorSlice';
import type { ConsoleLogEntry } from '../../types';

// ─── Log level styles ─────────────────────────────────────────────────────────

const LEVEL_STYLES: Record<ConsoleLogEntry['level'], string> = {
  info:    'text-blue-400',
  success: 'text-green-400',
  error:   'text-red-400',
  warn:    'text-yellow-400',
};

const LEVEL_PREFIX: Record<ConsoleLogEntry['level'], string> = {
  info:    '●',
  success: '✔',
  error:   '✘',
  warn:    '⚠',
};

// ─── Component ────────────────────────────────────────────────────────────────

const BottomPanel: React.FC = () => {
  const dispatch = useAppDispatch();
  const consoleLogs = useAppSelector((state) => state.editor.consoleLogs);
  const bottomRef = useRef<HTMLDivElement>(null);

  /** Auto-scroll to the latest log entry whenever the list grows. */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleLogs]);

  const handleClear = () => {
    dispatch(clearConsoleLogs());
  };

  return (
    <div className="h-48 border-t border-border bg-card flex flex-col">
      {/* Header */}
      <div className="h-10 flex items-center justify-between px-4 border-b border-border bg-muted/30 flex-shrink-0">
        <div className="flex items-center">
          <Terminal size={14} className="mr-2 text-muted-foreground" />
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Console
          </h2>
          {consoleLogs.length > 0 && (
            <span className="ml-2 text-xs text-muted-foreground">
              ({consoleLogs.length})
            </span>
          )}
        </div>

        <button
          id="btn-clear-console"
          onClick={handleClear}
          aria-label="Clear console"
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Log entries */}
      <div className="flex-1 p-3 overflow-y-auto font-mono text-xs space-y-1">
        {consoleLogs.length === 0 ? (
          <p className="text-muted-foreground select-none">&gt; Ready…</p>
        ) : (
          consoleLogs.map((entry) => (
            <div
              key={entry.id}
              className={`flex items-start gap-2 ${LEVEL_STYLES[entry.level]}`}
            >
              <span className="flex-shrink-0 mt-px select-none">
                {LEVEL_PREFIX[entry.level]}
              </span>
              <span className="break-all leading-relaxed">{entry.message}</span>
            </div>
          ))
        )}
        {/* Sentinel for auto-scroll */}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default BottomPanel;
