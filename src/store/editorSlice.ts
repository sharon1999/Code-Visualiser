import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { File as BabelFile } from '@babel/types';
import type { ConsoleLogEntry, ConsoleLogLevel, EditorState } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _logIdCounter = 0;

function makeLogEntry(
  level: ConsoleLogLevel,
  message: string,
): ConsoleLogEntry {
  return {
    id: `log-${Date.now()}-${_logIdCounter++}`,
    level,
    message,
    timestamp: Date.now(),
  };
}

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState: EditorState = {
  code: '// Welcome to the DSA Code Visualizer\nfunction twoSum(nums, target) {\n  \n}',
  language: 'javascript',
  isRunning: false,
  ast: null,
  consoleLogs: [],
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const editorSlice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    // ── Editor content ──────────────────────────────────────────────────────

    setCode: (state, action: PayloadAction<string>) => {
      state.code = action.payload;
    },

    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
    },

    resetCode: (state) => {
      state.code = initialState.code;
      state.isRunning = false;
      state.ast = null;
      state.consoleLogs = [];
    },

    // ── Run lifecycle ───────────────────────────────────────────────────────

    setIsRunning: (state, action: PayloadAction<boolean>) => {
      state.isRunning = action.payload;
    },

    // ── AST ─────────────────────────────────────────────────────────────────

    /** Stores the successfully parsed AST and appends a success log entry. */
    setAst: (state, action: PayloadAction<BabelFile>) => {
      state.ast = action.payload;
      state.consoleLogs.push(
        makeLogEntry('success', 'Parsed successfully — AST ready.'),
      );
    },

    /** Clears the stored AST (e.g. on Reset or before re-parsing). */
    clearAst: (state) => {
      state.ast = null;
    },

    // ── Console ──────────────────────────────────────────────────────────────

    /** Appends a single log entry to the console. */
    appendLog: (
      state,
      action: PayloadAction<{ level: ConsoleLogLevel; message: string }>,
    ) => {
      state.consoleLogs.push(
        makeLogEntry(action.payload.level, action.payload.message),
      );
    },

    /** Replaces all console logs with a fresh list. */
    setConsoleLogs: (state, action: PayloadAction<ConsoleLogEntry[]>) => {
      state.consoleLogs = action.payload;
    },

    /** Clears all console logs. */
    clearConsoleLogs: (state) => {
      state.consoleLogs = [];
    },
  },
});

export const {
  setCode,
  setLanguage,
  setIsRunning,
  resetCode,
  setAst,
  clearAst,
  appendLog,
  setConsoleLogs,
  clearConsoleLogs,
} = editorSlice.actions;

export default editorSlice.reducer;
