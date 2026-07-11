/**
 * Snapshot Recorder Service
 *
 * Processes the raw `ExecutionResult` produced by `executeCode` and exposes
 * the `ExecutionSnapshot[]` as a navigable timeline.
 *
 * Responsibilities
 * ────────────────
 * 1. Accepts a completed `ExecutionResult` (already contains `snapshots[]`
 *    built inside the worker).
 * 2. Post-processes snapshots: fills in any missing source-line information
 *    from the `CapturePoint[]` index, validates integrity, and applies
 *    optional filtering.
 * 3. Exposes a simple read API (`getSnapshot`, `getAll`, `getAt`) that the
 *    visualiser components use instead of accessing the raw array.
 * 4. Provides diff utilities (`diffSnapshots`) so the variable panel can
 *    highlight which bindings changed since the previous step.
 *
 * The recorder is intentionally **stateless** (a pure function + thin class
 * wrapper) so it can be called from any React component or hook without
 * introducing global singletons.
 *
 * Usage
 * ─────
 * ```ts
 * const recorder = new SnapshotRecorder(executionResult, capturePoints);
 * const snap = recorder.getAt(3);        // 4th snapshot (0-indexed)
 * const diff = recorder.diff(3, 4);      // changed vars between steps 3→4
 * ```
 */

import type {
  CapturePoint,
  ExecutionResult,
  ExecutionSnapshot,
} from "../types";

// ─── Types ─────────────────────────────────────────────────────────────────────

/**
 * Result of comparing two consecutive snapshots.
 * Used by the variable inspector to highlight changed bindings.
 */
export interface SnapshotDiff {
  /** Variables added since the previous snapshot. */
  added: string[];
  /** Variables that changed value since the previous snapshot. */
  changed: string[];
  /** Variables that no longer appear in the current scope. */
  removed: string[];
}

/**
 * Configuration options for the recorder.
 */
export interface SnapshotRecorderOptions {
  /**
   * When `true`, snapshots where the variable store is identical to the
   * previous snapshot are de-duplicated (useful for tightly-looping code
   * that produces no visible state change).
   * Default: `false`.
   */
  deduplicateIdentical?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Deep-equal comparison for snapshot variable maps.
 * Only needs to handle the serialised output of the worker (primitives and
 * heap-ref strings), so a JSON round-trip is sufficient.
 */
function variablesEqual(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

/**
 * Formats a raw `unknown` value (from `args`) into a display string.
 * Used to turn `console.log` arg lists into single strings for
 * `ExecutionSnapshot.console`.
 */
export function formatLogArgs(args: unknown[]): string {
  return args
    .map((a) => {
      if (typeof a === "string") return a;
      try {
        return JSON.stringify(a, null, 2);
      } catch {
        return String(a);
      }
    })
    .join(" ");
}

// ─── SnapshotRecorder class ───────────────────────────────────────────────────

/**
 * Wraps an `ExecutionResult` and provides a high-level API for the visualiser
 * to navigate the snapshot timeline.
 *
 * @example
 * ```ts
 * const tx = transformCode(userCode);
 * const exec = await executeCode(tx.transformedCode, tx.capturePoints);
 * const recorder = new SnapshotRecorder(exec, tx.capturePoints);
 *
 * console.log(recorder.length);           // total number of steps
 * console.log(recorder.getAt(0));         // first snapshot
 * console.log(recorder.diff(0, 1));       // what changed in step 2
 * ```
 */
export class SnapshotRecorder {
  private readonly _snapshots: ExecutionSnapshot[];
  private readonly _lineByStep: Map<number, number>;

  constructor(
    result: ExecutionResult,
    capturePoints: CapturePoint[] = [],
    options: SnapshotRecorderOptions = {},
  ) {
    // Build a step → line lookup from the compile-time capture points
    this._lineByStep = new Map<number, number>();
    for (const cp of capturePoints) {
      if (cp.line != null) this._lineByStep.set(cp.step, cp.line);
    }

    // Post-process snapshots: fill missing lines and optionally de-duplicate
    let processed = result.snapshots.map((snap) =>
      this._enrichSnapshot(snap),
    );

    if (options.deduplicateIdentical) {
      processed = this._deduplicate(processed);
    }

    this._snapshots = processed;
  }

  // ── Private post-processing ────────────────────────────────────────────────

  /**
   * Fills in `line` from the `CapturePoint` index when the worker emitted 0.
   * Returns a new snapshot object (does not mutate).
   */
  private _enrichSnapshot(snap: ExecutionSnapshot): ExecutionSnapshot {
    if (snap.line !== 0) return snap;
    const line = this._lineByStep.get(snap.id);
    if (line == null) return snap;
    return { ...snap, line };
  }

  /**
   * Removes consecutive snapshots that have identical variable stores.
   * Keeps the first occurrence in each run of identical snapshots.
   */
  private _deduplicate(snapshots: ExecutionSnapshot[]): ExecutionSnapshot[] {
    return snapshots.filter((snap, i) => {
      if (i === 0) return true;
      return !variablesEqual(snap.variables, snapshots[i - 1].variables);
    });
  }

  // ── Public read API ────────────────────────────────────────────────────────

  /** Total number of snapshots in the timeline. */
  get length(): number {
    return this._snapshots.length;
  }

  /** `true` when no snapshots were recorded (empty execution or early error). */
  get isEmpty(): boolean {
    return this._snapshots.length === 0;
  }

  /**
   * Returns all snapshots in chronological order.
   * The returned array is a shallow copy — callers must not mutate it.
   */
  getAll(): ExecutionSnapshot[] {
    return [...this._snapshots];
  }

  /**
   * Returns the snapshot at zero-based index `index`, or `undefined` when
   * `index` is out of range.
   */
  getAt(index: number): ExecutionSnapshot | undefined {
    return this._snapshots[index];
  }

  /**
   * Returns the snapshot whose `id` (step) equals `step`, or `undefined`.
   */
  getByStep(step: number): ExecutionSnapshot | undefined {
    return this._snapshots.find((s) => s.id === step);
  }

  /**
   * Returns the first snapshot, or `undefined` when the timeline is empty.
   */
  first(): ExecutionSnapshot | undefined {
    return this._snapshots[0];
  }

  /**
   * Returns the last snapshot, or `undefined` when the timeline is empty.
   */
  last(): ExecutionSnapshot | undefined {
    return this._snapshots[this._snapshots.length - 1];
  }

  // ── Diff API ───────────────────────────────────────────────────────────────

  /**
   * Computes the diff between the snapshots at indices `fromIndex` and
   * `toIndex`.
   *
   * @returns A {@link SnapshotDiff} describing which variable bindings were
   *   added, changed, or removed.  Returns an empty diff when either index is
   *   out of range.
   */
  diff(fromIndex: number, toIndex: number): SnapshotDiff {
    const a = this._snapshots[fromIndex];
    const b = this._snapshots[toIndex];

    if (!a || !b) return { added: [], changed: [], removed: [] };

    const aVars = a.variables;
    const bVars = b.variables;

    const aKeys = new Set(Object.keys(aVars));
    const bKeys = new Set(Object.keys(bVars));

    const added: string[] = [];
    const changed: string[] = [];
    const removed: string[] = [];

    for (const key of bKeys) {
      if (!aKeys.has(key)) {
        added.push(key);
      } else if (
        JSON.stringify(aVars[key]) !== JSON.stringify(bVars[key])
      ) {
        changed.push(key);
      }
    }

    for (const key of aKeys) {
      if (!bKeys.has(key)) removed.push(key);
    }

    return { added, changed, removed };
  }

  /**
   * Convenience: diff from the snapshot *before* `index` to `index`.
   * Returns an empty diff for index 0 (no previous snapshot).
   */
  diffFromPrevious(index: number): SnapshotDiff {
    if (index === 0) return { added: [], changed: [], removed: [] };
    return this.diff(index - 1, index);
  }

  // ── Filter API ─────────────────────────────────────────────────────────────

  /**
   * Returns all snapshots where the source `line` matches.
   */
  byLine(line: number): ExecutionSnapshot[] {
    return this._snapshots.filter((s) => s.line === line);
  }

  /**
   * Returns all snapshots recorded while inside `functionName`.
   */
  byFunction(functionName: string): ExecutionSnapshot[] {
    return this._snapshots.filter(
      (s) => s.executionContext.currentFunction === functionName,
    );
  }

  /**
   * Returns all snapshots recorded while inside a loop (loopDepth > 0).
   */
  inLoops(): ExecutionSnapshot[] {
    return this._snapshots.filter((s) => s.executionContext.loopDepth > 0);
  }
}

// ─── Convenience function ─────────────────────────────────────────────────────

/**
 * Creates a `SnapshotRecorder` from the results of a full pipeline run.
 *
 * @example
 * ```ts
 * import { transformCode } from './transformer';
 * import { executeCode }   from './executor';
 * import { createRecorder } from './snapshotRecorder';
 *
 * const tx = transformCode(code);
 * if (!tx.success) return;
 *
 * const exec = await executeCode(tx.transformedCode, tx.capturePoints);
 * const recorder = createRecorder(exec, tx.capturePoints);
 *
 * recorder.getAll().forEach((snap, i) => {
 *   console.log(`Step ${snap.id}:`, snap.variables);
 * });
 * ```
 */
export function createRecorder(
  result: ExecutionResult,
  capturePoints: CapturePoint[] = [],
  options?: SnapshotRecorderOptions,
): SnapshotRecorder {
  return new SnapshotRecorder(result, capturePoints, options);
}
