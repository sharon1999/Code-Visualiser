/**
 * LinkedListDetector
 *
 * Detects singly-linked list structures by recognising nodes whose serialised
 * heap object has:
 *   - A **value** property: `val`, `value`, or `data`
 *   - A **next pointer** property: `next` or `nxt`
 *
 * The detector follows the chain of heap refs, collecting nodes until it
 * reaches `null`, an unresolvable ref, or a previously-seen ref (cycle).
 *
 * Cycle detection uses Floyd's two-pointer algorithm on the heap refs
 * collected during traversal.
 */

import type {
  AnalysisContext,
  Detector,
  LinkedListNodeViz,
  LinkedListVisualization,
} from "../models/visualization";
import type { HeapEntry } from "../../types";
import { isHeapRef } from "../utils/snapshotAccessor";
import {
  LL_NEXT_PROPS,
  LL_VALUE_PROPS,
} from "../utils/naming";

/** Maximum number of nodes traversed before giving up (guards very long lists). */
const MAX_NODES = 500;

export class LinkedListDetector implements Detector<LinkedListVisualization> {
  readonly id = "LinkedListDetector";

  supports(context: AnalysisContext): boolean {
    for (const [, { entry }] of context.objectVars) {
      if (this._isListNode(entry)) return true;
    }
    return false;
  }

  analyze(context: AnalysisContext): LinkedListVisualization[] {
    const results: LinkedListVisualization[] = [];
    const heap = context.snapshot.heap;
    // Track which refs have already been claimed as the start of a list so we
    // don't emit duplicate lists for intermediate nodes.
    const claimedRefs = new Set<string>();

    for (const [name, { ref, entry }] of context.objectVars) {
      if (!this._isListNode(entry)) continue;
      if (claimedRefs.has(ref)) continue;

      const { nodes, hasCycle } = this._traverse(ref, heap);

      // Mark all node refs as claimed
      for (const node of nodes) claimedRefs.add(node.heapRef);

      results.push({ type: "linked-list", name, nodes, hasCycle });
    }

    return results;
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private _isListNode(entry: HeapEntry): boolean {
    if (entry.kind !== "object") return false;
    const obj = entry.value as Record<string, unknown>;
    return this._hasValProp(obj) && this._hasNextProp(obj);
  }

  private _hasValProp(obj: Record<string, unknown>): boolean {
    for (const p of LL_VALUE_PROPS) if (p in obj) return true;
    return false;
  }

  private _hasNextProp(obj: Record<string, unknown>): boolean {
    for (const p of LL_NEXT_PROPS) if (p in obj) return true;
    return false;
  }

  /**
   * Traverses the linked list starting at `startRef`, collecting nodes.
   * Returns `{ nodes, hasCycle }`.
   */
  private _traverse(
    startRef: string,
    heap: Record<string, HeapEntry>,
  ): { nodes: LinkedListNodeViz[]; hasCycle: boolean } {
    const nodes: LinkedListNodeViz[] = [];
    const visited = new Set<string>();
    let currentRef: string | null = startRef;
    let hasCycle = false;
    let index = 0;

    while (currentRef !== null && index < MAX_NODES) {
      if (visited.has(currentRef)) {
        hasCycle = true;
        break;
      }
      visited.add(currentRef);

      const entry = heap[currentRef];
      if (!entry || entry.kind !== "object") break;

      const obj = entry.value as Record<string, unknown>;

      // Read value
      let nodeValue: unknown = undefined;
      for (const p of LL_VALUE_PROPS) {
        if (p in obj) { nodeValue = obj[p]; break; }
      }

      nodes.push({ index: index++, value: nodeValue, heapRef: currentRef });

      // Advance to next
      let nextVal: unknown = undefined;
      for (const p of LL_NEXT_PROPS) {
        if (p in obj) { nextVal = obj[p]; break; }
      }

      if (nextVal === null || nextVal === undefined) {
        currentRef = null;
      } else if (isHeapRef(nextVal)) {
        currentRef = nextVal as string;
      } else {
        // Non-null, non-heap-ref — treat as end of list
        currentRef = null;
      }
    }

    return { nodes, hasCycle };
  }
}
