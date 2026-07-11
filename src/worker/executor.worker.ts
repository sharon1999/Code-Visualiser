/// <reference lib="webworker" />
/**
 * Executor Worker (Phase 5 — Snapshot Recorder)
 *
 * Runs inside a Web Worker context (no DOM access).  Receives a `WorkerRequest`
 * with the transformer-instrumented JavaScript source and executes it inside a
 * sandboxed `new Function()` scope.
 *
 * Runtime hooks provided to user code
 * ────────────────────────────────────
 *   console          – sandboxed console (log/warn/error/info/…)
 *   __capture(step)  – snapshot trigger: serialises all state and posts an
 *                      `ExecutionSnapshot` to the main thread.
 *   __trackVar(name, value)
 *                    – updates the live variable store so the next snapshot
 *                      reflects the current value.
 *   __enterScope(fnName, line)
 *                    – pushes a StackFrame onto the call-stack tracker.
 *   __exitScope()    – pops the top StackFrame.
 *   __enterLoop()    – increments the loop-depth counter.
 *   __exitLoop()     – decrements the loop-depth counter (called from finally).
 *
 * Sandbox layers
 * ──────────────
 * 1. `Object.defineProperty` – patches dangerous globals on `self` at load time.
 * 2. Function-parameter shadowing – blocks direct identifier access inside the
 *    `new Function()` body.
 */

import type {
  ExecutionSnapshot,
  HeapEntry,
  StackFrame,
  WorkerRequest,
  WorkerResponse,
} from "../types";

// ─── Typed self ────────────────────────────────────────────────────────────────

declare const self: DedicatedWorkerGlobalScope;

// ─── Sandbox: global-level patching ───────────────────────────────────────────

const BLOCKED_GLOBALS = [
  "fetch",
  "XMLHttpRequest",
  "WebSocket",
  "EventSource",
  "indexedDB",
  "openDatabase",
  "caches",
  "cookieStore",
  "BroadcastChannel",
  "SharedWorker",
  "Notification",
] as const;

for (const name of BLOCKED_GLOBALS) {
  try {
    Object.defineProperty(self, name, {
      value: undefined,
      writable: false,
      configurable: false,
      enumerable: false,
    });
  } catch {
    try {
      (self as unknown as Record<string, unknown>)[name] = undefined;
    } catch {
      /* ignore */
    }
  }
}

// ─── postMessage helper ────────────────────────────────────────────────────────

function post(msg: WorkerResponse): void {
  self.postMessage(msg);
}

// ─── Stack-trace helpers ───────────────────────────────────────────────────────

function extractLine(err: Error): number | null {
  if (!err.stack) return null;
  const m =
    /<anonymous>:(\d+):\d+/.exec(err.stack) ??
    /eval[^)]*:(\d+):\d+/.exec(err.stack);
  if (!m) return null;
  const raw = parseInt(m[1], 10);
  return isNaN(raw) ? null : Math.max(1, raw - 1);
}

function extractColumn(err: Error): number | null {
  if (!err.stack) return null;
  const m =
    /<anonymous>:\d+:(\d+)/.exec(err.stack) ??
    /eval[^)]*:\d+:(\d+)/.exec(err.stack);
  if (!m) return null;
  const raw = parseInt(m[1], 10);
  return isNaN(raw) ? null : raw;
}

// ─── Heap serialiser ──────────────────────────────────────────────────────────

let heapIdCounter = 0;
/** WeakMap so the same object always gets the same heap ID within one execution. */
const heapIdCache = new WeakMap<object, string>();

/**
 * Returns a stable `@hN` id for a reference-type value.
 * Allocates a new id on first encounter.
 */
function heapId(obj: object): string {
  if (heapIdCache.has(obj)) return heapIdCache.get(obj)!;
  const id = `@h${++heapIdCounter}`;
  heapIdCache.set(obj, id);
  return id;
}

/**
 * Recursively serialises a value for snapshot storage.
 *
 * - Primitives are returned as-is.
 * - Reference types are added to `heapMap` under their heap id, and the id
 *   string (`"@h1"` etc.) is returned in their place.
 *
 * Circular / deeply-nested structures are guarded by `depth`.
 */
function serialise(
  value: unknown,
  heapMap: Record<string, HeapEntry>,
  depth = 0,
): unknown {
  if (depth > 8) return "[deep]";

  // Primitives – inline directly
  if (
    value === null ||
    value === undefined ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "string" ||
    typeof value === "bigint" ||
    typeof value === "symbol"
  ) {
    return typeof value === "bigint"
      ? `${value.toString()}n`
      : typeof value === "symbol"
        ? value.toString()
        : value;
  }

  if (typeof value === "function") {
    const id = heapId(value as object);
    if (!heapMap[id]) {
      let src = "[function]";
      try {
        src = Function.prototype.toString.call(value);
        if (src.length > 200) src = src.slice(0, 200) + "…";
      } catch {
        /* ignore */
      }
      heapMap[id] = { id, kind: "function", value: src };
    }
    return id;
  }

  if (Array.isArray(value)) {
    const id = heapId(value);
    if (!heapMap[id]) {
      // Reserve the entry before recursing to handle circular refs
      heapMap[id] = { id, kind: "array", value: [] };
      heapMap[id].value = value
        .slice(0, 100)
        .map((item) => serialise(item, heapMap, depth + 1));
    }
    return id;
  }

  if (value instanceof Map) {
    const id = heapId(value);
    if (!heapMap[id]) {
      heapMap[id] = { id, kind: "map", value: [] };
      const entries: unknown[] = [];
      let count = 0;
      for (const [k, v] of value) {
        if (count++ > 50) { entries.push("[…]"); break; }
        entries.push([
          serialise(k, heapMap, depth + 1),
          serialise(v, heapMap, depth + 1),
        ]);
      }
      heapMap[id].value = entries;
    }
    return id;
  }

  if (value instanceof Set) {
    const id = heapId(value);
    if (!heapMap[id]) {
      heapMap[id] = { id, kind: "set", value: [] };
      const items: unknown[] = [];
      let count = 0;
      for (const v of value) {
        if (count++ > 50) { items.push("[…]"); break; }
        items.push(serialise(v, heapMap, depth + 1));
      }
      heapMap[id].value = items;
    }
    return id;
  }

  if (typeof value === "object") {
    const id = heapId(value as object);
    if (!heapMap[id]) {
      heapMap[id] = { id, kind: "object", value: {} };
      const repr: Record<string, unknown> = {};
      let count = 0;
      for (const key of Object.keys(value as object)) {
        if (count++ > 50) { repr["[…]"] = "…"; break; }
        try {
          repr[key] = serialise(
            (value as Record<string, unknown>)[key],
            heapMap,
            depth + 1,
          );
        } catch {
          repr[key] = "[unreadable]";
        }
      }
      heapMap[id].value = repr;
    }
    return id;
  }

  return String(value);
}

// ─── Snapshot builder ─────────────────────────────────────────────────────────

/**
 * Builds an `ExecutionSnapshot` from the current runtime state.
 *
 * Called inside `__capture(step)`.
 */
function buildSnapshot(
  step: number,
  line: number,
  varStore: Map<string, unknown>,
  callStack: StackFrame[],
  consoleLogs: string[],
  loopDepth: number,
): ExecutionSnapshot {
  // Reset heap cache per snapshot so ids are stable within one snapshot but
  // independent across snapshots (simpler for the visualiser to consume).
  heapIdCounter = 0;
  // Note: we intentionally do NOT clear `heapIdCache` here because we want
  // the same object to get the same id across snapshots (pointer stability).

  const heapMap: Record<string, HeapEntry> = {};
  const variables: Record<string, unknown> = {};

  for (const [name, value] of varStore) {
    variables[name] = serialise(value, heapMap);
  }

  const currentFunction =
    callStack.length > 0
      ? callStack[callStack.length - 1].functionName
      : "<global>";

  return {
    id: step,
    line,
    variables,
    heap: heapMap,
    callStack: [...callStack],
    console: [...consoleLogs],
    timestamp: Date.now(),
    executionContext: {
      currentFunction,
      loopDepth,
    },
  };
}

// ─── Message handler ───────────────────────────────────────────────────────────

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  if (msg.type !== "execute") return;

  const { code } = msg;

  // ── Execution state ────────────────────────────────────────────────────────

  let currentStep: number | null = null;
  let hasError = false;

  /** Live variable store – updated by `__trackVar`. */
  const varStore = new Map<string, unknown>();

  /** Call-stack frames – managed by `__enterScope` / `__exitScope`. */
  const callStack: StackFrame[] = [];

  /** Accumulated console lines (formatted strings). */
  const consoleLogs: string[] = [];

  /** Current loop nesting depth. */
  let loopDepth = 0;

  /**
   * Map of step → source line, built from `CapturePoint` data embedded in the
   * transformed code via `__capture` calls.  Since we don't have direct access
   * to the `CapturePoint[]` array inside the worker, we derive the line lazily:
   * the transformer encodes the source line as the second argument of a special
   * `__setLine(step, line)` call... but that would require another hook.
   *
   * Simpler: the transformer already knows the line at build time, so we accept
   * a `line` parameter directly in `__capture`.  See the updated transformer
   * signature below.
   *
   * For now we default to 0 and let the snapshot recorder on the main thread
   * fill in the correct line from `CapturePoint[]`.
   */
  const stepLineMap = new Map<number, number>();

  // ── Sandboxed console ──────────────────────────────────────────────────────

  function formatArgs(args: unknown[]): string {
    return args
      .map((a) => {
        if (typeof a === "string") return a;
        try {
          return JSON.stringify(a);
        } catch {
          return String(a);
        }
      })
      .join(" ");
  }

  const sandboxConsole = {
    log: (...args: unknown[]) => {
      const line = formatArgs(args);
      consoleLogs.push(line);
      post({ type: "log", step: currentStep, args });
    },
    info: (...args: unknown[]) => {
      consoleLogs.push(formatArgs(args));
      post({ type: "log", step: currentStep, args });
    },
    debug: (...args: unknown[]) => {
      consoleLogs.push(formatArgs(args));
      post({ type: "log", step: currentStep, args });
    },
    dir: (...args: unknown[]) => {
      consoleLogs.push(formatArgs(args));
      post({ type: "log", step: currentStep, args });
    },
    table: (...args: unknown[]) => {
      consoleLogs.push(formatArgs(args));
      post({ type: "log", step: currentStep, args });
    },
    warn: (...args: unknown[]) => {
      const line = "[warn] " + formatArgs(args);
      consoleLogs.push(line);
      post({ type: "log", step: currentStep, args: ["[warn]", ...args] });
    },
    error: (...args: unknown[]) => {
      const line = "[error] " + formatArgs(args);
      consoleLogs.push(line);
      post({ type: "log", step: currentStep, args: ["[error]", ...args] });
    },
    group: (...args: unknown[]) => {
      consoleLogs.push("[group] " + formatArgs(args));
      post({ type: "log", step: currentStep, args: ["[group]", ...args] });
    },
    groupCollapsed: (...args: unknown[]) => {
      consoleLogs.push("[group] " + formatArgs(args));
      post({ type: "log", step: currentStep, args: ["[group]", ...args] });
    },
    groupEnd: () => { /* no-op */ },
    clear: () => { /* no-op */ },
    count: () => { /* no-op */ },
    countReset: () => { /* no-op */ },
    time: () => { /* no-op */ },
    timeEnd: () => { /* no-op */ },
    timeLog: () => { /* no-op */ },
    assert: (condition: boolean, ...args: unknown[]) => {
      if (!condition) {
        const line = "Assertion failed: " + formatArgs(args);
        consoleLogs.push(line);
        post({ type: "log", step: currentStep, args: ["Assertion failed:", ...args] });
      }
    },
  };

  // ── Runtime hooks ──────────────────────────────────────────────────────────

  /**
   * Primary snapshot trigger.  Called by every `__capture(step)` the
   * transformer injected.
   *
   * @param step - The sequential step index (1-based).
   * @param line - The 1-based source line (0 = unknown; resolved by recorder).
   */
  const __capture = (step: number, line = 0): void => {
    currentStep = step;
    stepLineMap.set(step, line);

    const snapshot = buildSnapshot(
      step,
      line,
      varStore,
      callStack,
      consoleLogs,
      loopDepth,
    );

    post({ type: "snapshot", snapshot });
  };

  /**
   * Updates the live variable store.
   * Called immediately after every variable declaration and assignment.
   */
  const __trackVar = (name: string, value: unknown): void => {
    varStore.set(name, value);
  };

  /**
   * Pushes a new StackFrame.
   * Called at the entry of every function.
   */
  const __enterScope = (functionName: string, line: number | null): void => {
    callStack.push({ functionName, line });
  };

  /**
   * Pops the top StackFrame.
   * Called before every return statement and at function end.
   */
  const __exitScope = (): void => {
    callStack.pop();
  };

  /**
   * Increments the loop-depth counter.
   * Called before each loop statement.
   */
  const __enterLoop = (): void => {
    loopDepth++;
  };

  /**
   * Decrements the loop-depth counter.
   * Called from the `finally` block wrapping each loop statement.
   */
  const __exitLoop = (): void => {
    if (loopDepth > 0) loopDepth--;
  };

  // ── Build and run the sandboxed function ───────────────────────────────────

  try {
    const sandboxed = new Function(
      // Provided hooks
      "console",
      "__capture",
      "__trackVar",
      "__enterScope",
      "__exitScope",
      "__enterLoop",
      "__exitLoop",
      // Blocked globals
      "window",
      "document",
      "localStorage",
      "sessionStorage",
      "location",
      "history",
      "navigator",
      "fetch",
      "XMLHttpRequest",
      "WebSocket",
      "EventSource",
      "indexedDB",
      "openDatabase",
      "Worker",
      "SharedWorker",
      "ServiceWorker",
      "Notification",
      "alert",
      "confirm",
      "prompt",
      // User code
      code,
    );

    sandboxed(
      /* console          */ sandboxConsole,
      /* __capture        */ __capture,
      /* __trackVar       */ __trackVar,
      /* __enterScope     */ __enterScope,
      /* __exitScope      */ __exitScope,
      /* __enterLoop      */ __enterLoop,
      /* __exitLoop       */ __exitLoop,
      /* window           */ undefined,
      /* document         */ undefined,
      /* localStorage     */ undefined,
      /* sessionStorage   */ undefined,
      /* location         */ undefined,
      /* history          */ undefined,
      /* navigator        */ undefined,
      /* fetch            */ undefined,
      /* XMLHttpRequest   */ undefined,
      /* WebSocket        */ undefined,
      /* EventSource      */ undefined,
      /* indexedDB        */ undefined,
      /* openDatabase     */ undefined,
      /* Worker           */ undefined,
      /* SharedWorker     */ undefined,
      /* ServiceWorker    */ undefined,
      /* Notification     */ undefined,
      /* alert            */ undefined,
      /* confirm          */ undefined,
      /* prompt           */ undefined,
    );
  } catch (thrown) {
    hasError = true;

    if (thrown instanceof Error) {
      post({
        type: "error",
        message: thrown.message,
        line: extractLine(thrown),
        column: extractColumn(thrown),
        stack: thrown.stack ?? null,
      });
    } else {
      post({
        type: "error",
        message: String(thrown),
        line: null,
        column: null,
        stack: null,
      });
    }
  }

  post({ type: "done", success: !hasError });
};
