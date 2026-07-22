/**
 * useRunCode hook
 *
 * Connects the "Run" button to the full execution pipeline:
 *
 *   1. Parse (already shown in TopToolbar — reused here for AST)
 *   2. Transform  →  inject __capture() instrumentation
 *   3. Execute    →  run inside a Web Worker sandbox
 *   4. Record     →  post-process snapshots with SnapshotRecorder
 *   5. Load       →  dispatch loadSnapshots() into the playback store
 *
 * The hook is the single place that knows how all services interact.
 * Components call `runCode()` and read `isRunning` — nothing else.
 */

import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../store/store";
import { transformCode } from "../services/transformer";
import { executeCode } from "../services/executor";
import { SnapshotRecorder } from "../services/snapshotRecorder";
import { loadSnapshots, clear } from "../store/playback/actions";
import {
  setIsRunning,
  clearConsoleLogs,
  clearAst,
  appendLog,
} from "../store/editorSlice";

export function useRunCode() {
  const dispatch = useDispatch<AppDispatch>();
  const code     = useSelector((s: RootState) => s.editor.code);
  const isRunning = useSelector((s: RootState) => s.editor.isRunning);

  const runCode = useCallback(async () => {
    if (isRunning) return;

    // ── 1. Reset UI state ─────────────────────────────────────────────────
    dispatch(clearConsoleLogs());
    dispatch(clearAst());
    dispatch(clear());
    dispatch(setIsRunning(true));
    dispatch(appendLog({ level: "info", message: "Transforming code…" }));

    // ── 2. Transform (AST instrumentation) ───────────────────────────────
    const transformResult = transformCode(code);

    if (!transformResult.success) {
      const { message, line, column } = transformResult.error;
      const loc = line != null ? ` (L${line}${column != null ? `:${column}` : ""})` : "";
      dispatch(appendLog({ level: "error", message: `Transform error${loc}: ${message}` }));
      dispatch(setIsRunning(false));
      return;
    }

    dispatch(appendLog({ level: "info", message: "Executing in sandbox…" }));

    // ── 3. Execute in Web Worker ──────────────────────────────────────────
    let executionResult;
    try {
      executionResult = await executeCode(
        transformResult.transformedCode,
        transformResult.capturePoints,
      );
    } catch (err) {
      dispatch(appendLog({
        level: "error",
        message: `Executor crashed: ${err instanceof Error ? err.message : String(err)}`,
      }));
      dispatch(setIsRunning(false));
      return;
    }

    // ── 4. Push console output & errors into the UI console ───────────────
    for (const log of executionResult.logs) {
      const text = log.args.map((a) => {
        if (typeof a === "string") return a;
        try { return JSON.stringify(a); } catch { return String(a); }
      }).join(" ");
      dispatch(appendLog({ level: "info", message: text }));
    }

    for (const err of executionResult.errors) {
      const loc = err.line != null ? ` (L${err.line})` : "";
      dispatch(appendLog({ level: "error", message: `Runtime error${loc}: ${err.message}` }));
    }

    // ── 5. Record & load snapshots into playback store ────────────────────
    const recorder = new SnapshotRecorder(executionResult, transformResult.capturePoints);
    const snapshots = recorder.getAll();

    if (snapshots.length === 0) {
      dispatch(appendLog({
        level: "warn",
        message: "Execution produced no snapshots. Make sure your code has trackable statements.",
      }));
    } else {
      dispatch(appendLog({
        level: "success",
        message: `✔ Execution complete — ${snapshots.length} snapshot${snapshots.length !== 1 ? "s" : ""} recorded.`,
      }));
    }

    dispatch(loadSnapshots(snapshots));
    dispatch(setIsRunning(false));
  }, [code, isRunning, dispatch]);

  return { runCode, isRunning };
}
