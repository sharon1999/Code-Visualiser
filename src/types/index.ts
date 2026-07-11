import type { File as BabelFile } from "@babel/types";

// ─── Parser Types ──────────────────────────────────────────────────────────────

/**
 * Structured representation of a syntax error returned by the parser service.
 */
export interface ParseError {
  /** Human-readable error message from Babel. */
  message: string;
  /** 1-based line number where the error occurred, or null if unavailable. */
  line: number | null;
  /** 0-based column number where the error occurred, or null if unavailable. */
  column: number | null;
}

/**
 * Discriminated union returned by `parseCode`.
 *
 * - On success: `{ success: true; ast: BabelFile }`
 * - On failure: `{ success: false; error: ParseError }`
 */
export type ParseResult =
  | { success: true; ast: BabelFile }
  | { success: false; error: ParseError };

// ─── Transformer Types ─────────────────────────────────────────────────────────

/**
 * A single capture point injected by the transformer.
 *
 * Each `__capture(step)` call corresponds to one of these entries, allowing
 * the runtime to map a step index back to the originating source location.
 */
export interface CapturePoint {
  /** Sequential 1-based step index matching the `__capture(step)` argument. */
  step: number;
  /**
   * The AST node type that triggered this capture
   * (e.g. "VariableDeclaration", "ReturnStatement").
   */
  nodeType: string;
  /** 1-based source line of the captured statement, or null when unavailable. */
  line: number | null;
  /** 0-based source column, or null when unavailable. */
  column: number | null;
}

/**
 * Successful result returned by `transformCode`.
 */
export interface TransformSuccess {
  success: true;
  /** The instrumented JavaScript source ready to be executed. */
  transformedCode: string;
  /**
   * Inline source map in JSON string form (v3 format).
   * Maps positions in `transformedCode` back to the original source.
   */
  sourceMap: string;
  /** Ordered list of every capture point inserted during transformation. */
  capturePoints: CapturePoint[];
}

/**
 * Failure result returned by `transformCode`.
 */
export interface TransformFailure {
  success: false;
  /** Structured error describing what went wrong (parse or internal error). */
  error: ParseError;
}

/** Discriminated union returned by `transformCode`. */
export type TransformResult = TransformSuccess | TransformFailure;

// ─── Transformer Options ───────────────────────────────────────────────────────

/**
 * Fine-grained control over which statement types get instrumented.
 * All flags default to `true`.
 */
export interface TransformOptions {
  /** Insert `__capture` after `VariableDeclaration` nodes. */
  captureVariableDeclarations?: boolean;
  /** Insert `__capture` after assignment expressions. */
  captureAssignments?: boolean;
  /** Insert `__capture` after bare expression statements. */
  captureExpressionStatements?: boolean;
  /** Insert `__capture` after standalone function call expressions. */
  captureFunctionCalls?: boolean;
  /** Insert `__capture` after `ReturnStatement` nodes. */
  captureReturnStatements?: boolean;
  /** Insert `__capture` at the start of every loop body iteration. */
  captureLoopIterations?: boolean;
  /** Insert `__capture` after each branch (`if` / `else`) block. */
  captureIfBlocks?: boolean;
  /**
   * Name of the runtime capture function injected into the output.
   * Defaults to `"__capture"`.
   */
  captureFunctionName?: string;
}

// ─── Execution Types ───────────────────────────────────────────────────────────

/**
 * A single `console.log` (or sibling) call captured during execution.
 *
 * `step` is the value of the last `__capture` call that fired before this log,
 * or `null` if the log occurred before any capture point was hit.
 */
export interface ExecutionLog {
  /** The active `__capture` step index when the log fired, or null. */
  step: number | null;
  /** Raw arguments passed to `console.log / .warn / .error / .info`. */
  args: unknown[];
  /** `Date.now()` timestamp recorded inside the worker. */
  timestamp: number;
}

/**
 * A runtime error caught during code execution inside the worker.
 */
export interface ExecutionError {
  /** Human-readable error message. */
  message: string;
  /** 1-based line number in the *transformed* source, or null. */
  line: number | null;
  /** 0-based column in the transformed source, or null. */
  column: number | null;
  /** Full stack trace string, or null when unavailable. */
  stack: string | null;
}

/**
 * Fires every time `__capture(step)` is called inside the transformed code.
 * Kept for backward-compat; the richer `ExecutionSnapshot` supersedes it for
 * visualisation.
 */
export interface CaptureEvent {
  /** Sequential step index matching the `__capture(step)` argument. */
  step: number;
  /** `Date.now()` timestamp recorded inside the worker. */
  timestamp: number;
}

// ─── Snapshot Types (Phase 5 — single source of truth) ────────────────────────

/**
 * One frame in the call stack at the moment a snapshot was taken.
 *
 * Frames are ordered outermost → innermost, so index 0 is always the
 * global / module scope and the last element is the currently executing
 * function.
 */
export interface StackFrame {
  /**
   * Name of the function.
   * `"<global>"` is used for top-level (module-scope) code.
   */
  functionName: string;
  /**
   * 1-based source line where this function was entered, or null when
   * the information is unavailable.
   */
  line: number | null;
}

/**
 * A single entry in the heap map.
 *
 * Primitive values (number, string, boolean, null, undefined) are stored
 * inline in `ExecutionSnapshot.variables`.  Everything else (objects, arrays,
 * Maps, Sets, functions) is moved here and replaced in `variables` with a
 * `HeapRef` string (`"@h1"`, `"@h2"`, …) so the visualiser can render pointer
 * arrows between boxes.
 */
export interface HeapEntry {
  /** Stable heap-object identifier, e.g. `"@h1"`. */
  id: string;
  /**
   * The semantic kind of the value:
   * - `"object"`   – plain `{}` or class instance
   * - `"array"`    – `[]`
   * - `"map"`      – `Map`
   * - `"set"`      – `Set`
   * - `"function"` – function / arrow / class
   * - `"other"`    – anything else non-primitive
   */
  kind: "object" | "array" | "map" | "set" | "function" | "other";
  /**
   * JSON-serialisable representation of the value's contents.
   *
   * | kind       | shape                                              |
   * |------------|----------------------------------------------------|
   * | `array`    | `unknown[]` (items; primitives or heap refs)       |
   * | `object`   | `Record<string, unknown>` (own enumerable props)   |
   * | `map`      | `[unknown, unknown][]` (entries)                   |
   * | `set`      | `unknown[]` (values)                               |
   * | `function` | `string` (source code)                             |
   * | `other`    | `string` (`String(value)`)                         |
   */
  value: unknown;
}

/**
 * Rich execution snapshot recorded at every `__capture(step)` call.
 *
 * **Single source of truth** for the visualiser.  Every panel — variable
 * inspector, heap diagram, call stack, console — derives its display state
 * from this object.  The `ExecutionSnapshot[]` array forms a complete replay
 * timeline of the program.
 */
export interface ExecutionSnapshot {
  /** Monotonically increasing snapshot id matching `__capture(step)`. */
  id: number;
  /**
   * 1-based source line of the statement that triggered this snapshot.
   * Mapped from `CapturePoint.line` using the step index as the key.
   */
  line: number;
  /**
   * All variables visible in the current scope at capture time.
   *
   * - Primitive values are stored directly (number, string, boolean,
   *   null, undefined, bigint).
   * - Reference-type values are replaced with a heap-ref string
   *   (`"@h1"`, `"@h2"`, …) pointing into `heap`.
   */
  variables: Record<string, unknown>;
  /**
   * Heap objects extracted from the variable store.
   * Keys are the heap-ref strings (`"@h1"`, `"@h2"`, …).
   */
  heap: Record<string, HeapEntry>;
  /** Call stack at the moment of capture, outermost frame first. */
  callStack: StackFrame[];
  /**
   * Formatted console lines emitted up to and **including** this snapshot.
   * Each element is the string produced by joining the `console.log` args.
   */
  console: string[];
  /** `Date.now()` recorded inside the worker at capture time. */
  timestamp: number;
  /** High-level execution context derived from the runtime tracking state. */
  executionContext: {
    /** Name of the innermost executing function, or `"<global>"`. */
    currentFunction: string;
    /** Number of nested loops currently active at this snapshot point. */
    loopDepth: number;
  };
}

/**
 * The complete result of one code execution, returned by `executeCode`.
 */
export interface ExecutionResult {
  /**
   * `true` when the code ran without throwing, `false` on any runtime error
   * or when the 5-second timeout was reached.
   */
  success: boolean;
  /** Ordered list of console output captured during execution. */
  logs: ExecutionLog[];
  /** All runtime errors collected. */
  errors: ExecutionError[];
  /** Lightweight capture-event list (step + timestamp only). */
  captureEvents: CaptureEvent[];
  /**
   * Rich execution snapshots — one per `__capture` call.
   *
   * This is the **primary visualiser data source**.  All state panels consume
   * `snapshots` rather than the raw `captureEvents`.
   */
  snapshots: ExecutionSnapshot[];
}

// ─── Worker Message Protocol ───────────────────────────────────────────────────

/**
 * Messages sent from the **main thread → worker**.
 */
export type WorkerRequest = {
  /** Execute the provided transformed JavaScript string. */
  type: "execute";
  code: string;
};

/**
 * Messages sent from the **worker → main thread**.
 *
 * Typed as a discriminated union so every `switch (msg.type)` is exhaustive.
 */
export type WorkerResponse =
  | {
      type: "log";
      /** Active step index at log time, or null before first capture. */
      step: number | null;
      args: unknown[];
    }
  | {
      /**
       * Full execution snapshot emitted at each `__capture(step)` call.
       * Replaces the old bare `"capture"` message for visualisation purposes.
       */
      type: "snapshot";
      snapshot: ExecutionSnapshot;
    }
  | {
      type: "error";
      message: string;
      line: number | null;
      column: number | null;
      stack: string | null;
    }
  | {
      /** Signals that execution finished (successfully or not). */
      type: "done";
      success: boolean;
    };
