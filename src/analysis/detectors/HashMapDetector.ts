/**
 * HashMapDetector
 *
 * Detects two kinds of hash-map structures:
 *
 *   1. **JS `Map` instances** — heap entries with `kind: "map"`.
 *      These are always treated as hash maps.
 *
 *   2. **Plain objects used as hash maps** — heap entries with `kind: "object"`
 *      whose shape does NOT match a linked-list node, tree node, or graph
 *      adjacency list.
 *
 * The disambiguation heuristics used for plain objects:
 *   - Linked-list node: has a value prop (`val`/`value`/`data`) AND a next
 *     prop (`next`/`nxt`).
 *   - Tree node: has a value prop AND a left/right prop.
 *   - Graph adjacency list: ALL property values are heap refs to arrays.
 *   - Everything else → hash map.
 */

import type {
  AnalysisContext,
  Detector,
  HashMapEntry,
  HashMapVisualization,
} from "../models/visualization";
import { isHeapRef } from "../utils/snapshotAccessor";
import { LL_NEXT_PROPS, LL_VALUE_PROPS, TREE_LEFT_PROPS, TREE_RIGHT_PROPS, TREE_VALUE_PROPS } from "../utils/naming";
import type { HeapEntry } from "../../types";

export class HashMapDetector implements Detector<HashMapVisualization> {
  readonly id = "HashMapDetector";

  supports(context: AnalysisContext): boolean {
    if (context.mapVars.size > 0) return true;
    for (const [, { entry }] of context.objectVars) {
      if (this._isHashMapObject(entry, context)) return true;
    }
    return false;
  }

  analyze(context: AnalysisContext): HashMapVisualization[] {
    const results: HashMapVisualization[] = [];

    // ── JS Map instances ──────────────────────────────────────────────────────
    for (const [name, { entry }] of context.mapVars) {
      const rawEntries = entry.value as [unknown, unknown][];
      const entries: HashMapEntry[] = rawEntries.map(([k, v]) => ({
        key: k,
        value: v,
      }));
      results.push({ type: "hashmap", name, kind: "Map", entries });
    }

    // ── Plain-object hash maps ────────────────────────────────────────────────
    for (const [name, { entry }] of context.objectVars) {
      if (!this._isHashMapObject(entry, context)) continue;

      const obj = entry.value as Record<string, unknown>;
      const entries: HashMapEntry[] = Object.entries(obj).map(([k, v]) => ({
        key: this._coerceKey(k),
        value: v,
      }));
      results.push({ type: "hashmap", name, kind: "object", entries });
    }

    return results;
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private _isHashMapObject(
    entry: HeapEntry,
    context: AnalysisContext,
  ): boolean {
    if (entry.kind !== "object") return false;
    const obj = entry.value as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length === 0) return false;

    // Exclude linked-list nodes
    const hasValProp =
      LL_VALUE_PROPS.has("val") && "val" in obj ||
      LL_VALUE_PROPS.has("value") && "value" in obj ||
      LL_VALUE_PROPS.has("data") && "data" in obj;
    const hasNextProp =
      LL_NEXT_PROPS.has("next") && "next" in obj ||
      LL_NEXT_PROPS.has("nxt") && "nxt" in obj;
    if (hasValProp && hasNextProp) return false;

    // Exclude tree nodes
    const hasTreeVal =
      TREE_VALUE_PROPS.has("val") && "val" in obj ||
      TREE_VALUE_PROPS.has("value") && "value" in obj ||
      TREE_VALUE_PROPS.has("data") && "data" in obj ||
      TREE_VALUE_PROPS.has("key") && "key" in obj;
    const hasLeftOrRight =
      TREE_LEFT_PROPS.has("left") && "left" in obj ||
      TREE_LEFT_PROPS.has("l") && "l" in obj ||
      TREE_RIGHT_PROPS.has("right") && "right" in obj ||
      TREE_RIGHT_PROPS.has("r") && "r" in obj;
    if (hasTreeVal && hasLeftOrRight) return false;

    // Exclude graph adjacency lists (all values are heap refs to arrays)
    const heap = context.snapshot.heap;
    const values = Object.values(obj);
    if (values.length > 0) {
      const allArrayRefs = values.every(
        (v) => isHeapRef(v) && heap[v as string]?.kind === "array",
      );
      if (allArrayRefs) return false;
    }

    return true;
  }

  /**
   * Converts a string key from a plain object into a number when it parses
   * cleanly as one, preserving the original string otherwise.
   */
  private _coerceKey(key: string): unknown {
    const n = Number(key);
    return Number.isNaN(n) ? key : n;
  }
}
