/**
 * Snapshot Accessor Utilities
 *
 * Low-level helpers for working with the Phase-5 snapshot format where complex
 * values are replaced with heap-ref strings (`"@h1"`, `"@h2"`, …).
 *
 * The most important export is `buildContext()`, which traverses `variables`
 * and `heap` exactly once to produce a typed `AnalysisContext` that all
 * detectors share.
 */

import type { ExecutionSnapshot, HeapEntry } from "../../types";
import type {
  AnalysisContext,
  PrimitiveDataType,
  PrimitiveValue,
} from "../models/visualization";

// ─── Heap-ref guards ──────────────────────────────────────────────────────────

/**
 * Returns `true` when `value` is a heap-reference string (e.g. `"@h3"`).
 */
export function isHeapRef(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("@h");
}

/**
 * Looks up a heap entry by reference.
 * Returns `null` when `value` is not a heap ref or the ref is not in `heap`.
 */
export function getHeapEntry(
  value: unknown,
  heap: Record<string, HeapEntry>,
): HeapEntry | null {
  if (!isHeapRef(value)) return null;
  return heap[value] ?? null;
}

/**
 * Resolves one level of indirection: if `value` is a heap ref, returns the
 * entry's `.value`; otherwise returns `value` as-is.
 */
export function resolveValue(
  value: unknown,
  heap: Record<string, HeapEntry>,
): unknown {
  const entry = getHeapEntry(value, heap);
  return entry !== null ? entry.value : value;
}

// ─── Primitive detection ───────────────────────────────────────────────────────

/**
 * Returns `true` for values that live inline in `variables`
 * (i.e. not heap refs).
 */
export function isPrimitive(value: unknown): value is PrimitiveValue {
  if (value === null || value === undefined) return true;
  const t = typeof value;
  return (
    t === "number" ||
    t === "string" ||
    t === "boolean" ||
    t === "bigint"
  );
}

/**
 * Maps a primitive JS value to its `PrimitiveDataType` tag.
 */
export function getPrimitiveDataType(value: PrimitiveValue): PrimitiveDataType {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  return typeof value as PrimitiveDataType;
}

// ─── Object shape helpers ─────────────────────────────────────────────────────

/**
 * Returns the value of the first matching property from `propNames`,
 * or `undefined` when none are present.
 */
export function getFirstProp(
  obj: Record<string, unknown>,
  propNames: ReadonlySet<string>,
): unknown {
  for (const name of propNames) {
    if (name in obj) return obj[name];
  }
  return undefined;
}

/**
 * Returns `true` when `obj` has at least one property from `propNames`.
 */
export function hasAnyProp(
  obj: Record<string, unknown>,
  propNames: ReadonlySet<string>,
): boolean {
  for (const name of propNames) {
    if (name in obj) return true;
  }
  return false;
}

// ─── Context builder ──────────────────────────────────────────────────────────

/**
 * Builds an `AnalysisContext` from an `ExecutionSnapshot`.
 *
 * Traverses `snapshot.variables` and `snapshot.heap` exactly **once**,
 * categorising every variable into the appropriate sub-map.
 *
 * Called once per snapshot by `AlgorithmAnalyzer` before dispatching to
 * detectors.  O(V + H) where V = number of variables, H = number of heap
 * entries referenced by variables.
 */
export function buildContext(snapshot: ExecutionSnapshot): AnalysisContext {
  const { variables, heap } = snapshot;

  const arrayVars = new Map<string, { ref: string; entry: HeapEntry }>();
  const mapVars = new Map<string, { ref: string; entry: HeapEntry }>();
  const setVars = new Map<string, { ref: string; entry: HeapEntry }>();
  const objectVars = new Map<string, { ref: string; entry: HeapEntry }>();
  const functionVars = new Map<string, { ref: string; entry: HeapEntry }>();
  const primitiveVars = new Map<string, PrimitiveValue>();
  const nonNegativeIntVars = new Map<string, number>();

  for (const [name, value] of Object.entries(variables)) {
    if (isHeapRef(value)) {
      const entry = heap[value as string];
      if (!entry) continue; // stale ref — skip

      const item = { ref: value as string, entry };
      switch (entry.kind) {
        case "array":    arrayVars.set(name, item);    break;
        case "map":      mapVars.set(name, item);      break;
        case "set":      setVars.set(name, item);      break;
        case "object":   objectVars.set(name, item);   break;
        case "function": functionVars.set(name, item); break;
        default:         objectVars.set(name, item);   break;
      }
    } else if (isPrimitive(value)) {
      primitiveVars.set(name, value as PrimitiveValue);

      if (
        typeof value === "number" &&
        Number.isInteger(value) &&
        value >= 0 &&
        Number.isFinite(value)
      ) {
        nonNegativeIntVars.set(name, value as number);
      }
    }
  }

  return {
    snapshot,
    arrayVars,
    mapVars,
    setVars,
    objectVars,
    functionVars,
    primitiveVars,
    nonNegativeIntVars,
  };
}
