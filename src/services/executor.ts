/**
 * Executor Service (main thread) — Phase 5
 *
 * Manages the lifecycle of the executor Web Worker.  For every `executeCode`
 * call it:
 *
 *   1. Spawns a fresh worker instance (isolated, no shared state between runs).
 *   2. Sends the transformed code to the worker via `WorkerRequest`.
 *   3. Accumulates `WorkerResponse` messages — logs, rich snapshots, errors —
 *      until the `'done'` signal arrives.
 *   4. Enforces a hard 5-second timeout: if the worker hasn't finished by then
 *      it is terminated and an error is added to the result.
 *   5. Resolves the returned Promise with a typed `ExecutionResult`.
 *
 * The service intentionally creates a **new** worker per execution rather than
 * reusing one.  This guarantees full isolation between runs.
 *
 * Usage:
 * ```ts
 * const result = await executeCode(transformedJs, capturePoints);
 * if (result.success) {
 *   console.log(result.snapshots);      // rich ExecutionSnapshot[]
 *   console.log(result.logs);           // raw console output
 * } else {
 *   console.error(result.errors);
 * }
 * ```
 */

import ExecutorWorkerConstructor from "../worker/executor.worker?worker";

import type {
  CapturePoint,
  ExecutionError,
  ExecutionLog,
  ExecutionResult,
  WorkerRequest,
  WorkerResponse,
} from "../types";

// ─── Constants ─────────────────────────────────────────────────────────────────

const EXECUTION_TIMEOUT_MS = 5_000;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Executes `code` (the output of `transformCode`) inside a sandboxed Web Worker
 * and returns an {@link ExecutionResult} promise.
 *
 * The promise **always resolves** – it never rejects.  All error states
 * (syntax errors, runtime throws, timeouts) are captured inside the result.
 *
 * @param code          - Transformer-instrumented JavaScript string.
 * @param capturePoints - The `CapturePoint[]` from `transformCode`, used to
 *                        back-fill correct source-line numbers into snapshots
 *                        (the worker emits `line: 0` when unavailable).
 */
export function executeCode(
  code: string,
  capturePoints: CapturePoint[] = [],
): Promise<ExecutionResult> {
  // Build a fast lookup: step → source line
  const lineByStep = new Map<number, number>();
  for (const cp of capturePoints) {
    if (cp.line != null) lineByStep.set(cp.step, cp.line);
  }

  return new Promise<ExecutionResult>((resolve) => {
    const result: ExecutionResult = {
      success: false,
      logs: [],
      errors: [],
      captureEvents: [],
      snapshots: [],
    };

    const worker = new ExecutorWorkerConstructor();

    // ── Timeout guard ────────────────────────────────────────────────────────
    const timeoutId = setTimeout(() => {
      worker.terminate();
      result.errors.push({
        message: `Execution timed out after ${EXECUTION_TIMEOUT_MS / 1_000} seconds. Check for infinite loops.`,
        line: null,
        column: null,
        stack: null,
      } satisfies ExecutionError);
      resolve(result);
    }, EXECUTION_TIMEOUT_MS);

    // ── Message handler ──────────────────────────────────────────────────────
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const msg = event.data;

      switch (msg.type) {
        case "log": {
          result.logs.push({
            step: msg.step,
            args: msg.args,
            timestamp: Date.now(),
          } satisfies ExecutionLog);
          break;
        }

        case "snapshot": {
          const snap = msg.snapshot;

          // Back-fill the source line from CapturePoint data if the worker
          // emitted `line: 0` (i.e. the transformed code didn't carry it).
          if (snap.line === 0 && lineByStep.has(snap.id)) {
            snap.line = lineByStep.get(snap.id)!;
          }

          result.snapshots.push(snap);

          // Also maintain the lightweight captureEvents list for compat.
          result.captureEvents.push({
            step: snap.id,
            timestamp: snap.timestamp,
          });
          break;
        }

        case "error": {
          result.errors.push({
            message: msg.message,
            line: msg.line,
            column: msg.column,
            stack: msg.stack,
          } satisfies ExecutionError);
          break;
        }

        case "done": {
          clearTimeout(timeoutId);
          result.success = msg.success;
          worker.terminate();
          resolve(result);
          break;
        }

        default: {
          const _exhaustive: never = msg;
          console.warn("[executor] Unexpected worker message:", _exhaustive);
        }
      }
    };

    // ── Worker-level error handler ───────────────────────────────────────────
    worker.onerror = (errorEvent: ErrorEvent) => {
      clearTimeout(timeoutId);
      result.errors.push({
        message: errorEvent.message ?? "Unknown worker error.",
        line: errorEvent.lineno ?? null,
        column: errorEvent.colno ?? null,
        stack: null,
      } satisfies ExecutionError);
      result.success = false;
      worker.terminate();
      resolve(result);
    };

    // ── Kick off execution ───────────────────────────────────────────────────
    worker.postMessage({ type: "execute", code } satisfies WorkerRequest);
  });
}
