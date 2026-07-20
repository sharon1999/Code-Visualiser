/**
 * TreeDetector
 *
 * Detects binary trees by recognising TreeNode-shaped heap objects with:
 *   - A **value** property: `val`, `value`, `data`, or `key`
 *   - At least one **child pointer** property: `left`, `l`, `right`, `r`
 *
 * The detector performs a recursive DFS to collect all reachable nodes,
 * building a flat `Record<id, BinaryTreeNodeViz>` map (better for layout
 * algorithms than a nested tree object).
 *
 * Cycle protection: any node ref that has already been visited is skipped.
 */

import type {
  AnalysisContext,
  BinaryTreeNodeViz,
  BinaryTreeVisualization,
  Detector,
} from "../models/visualization";
import type { HeapEntry } from "../../types";
import { isHeapRef } from "../utils/snapshotAccessor";
import {
  TREE_LEFT_PROPS,
  TREE_RIGHT_PROPS,
  TREE_VALUE_PROPS,
} from "../utils/naming";

/** Max tree nodes to visit (safeguard against degenerate inputs). */
const MAX_NODES = 1_000;

export class TreeDetector implements Detector<BinaryTreeVisualization> {
  readonly id = "TreeDetector";

  supports(context: AnalysisContext): boolean {
    for (const [, { entry }] of context.objectVars) {
      if (this._isTreeNode(entry)) return true;
    }
    return false;
  }

  analyze(context: AnalysisContext): BinaryTreeVisualization[] {
    const results: BinaryTreeVisualization[] = [];
    const heap = context.snapshot.heap;
    const claimedRefs = new Set<string>();

    for (const [name, { ref, entry }] of context.objectVars) {
      if (!this._isTreeNode(entry)) continue;
      if (claimedRefs.has(ref)) continue;

      const nodes: Record<string, BinaryTreeNodeViz> = {};
      const visited = new Set<string>();
      this._dfs(ref, heap, nodes, visited, 0);

      // Claim all discovered refs so child nodes don't spawn duplicate trees
      for (const id of Object.keys(nodes)) claimedRefs.add(id);

      results.push({
        type: "binary-tree",
        name,
        rootId: ref,
        nodes,
      });
    }

    return results;
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private _isTreeNode(entry: HeapEntry): boolean {
    if (entry.kind !== "object") return false;
    const obj = entry.value as Record<string, unknown>;
    return this._hasValueProp(obj) && this._hasChildProp(obj);
  }

  private _hasValueProp(obj: Record<string, unknown>): boolean {
    for (const p of TREE_VALUE_PROPS) if (p in obj) return true;
    return false;
  }

  private _hasChildProp(obj: Record<string, unknown>): boolean {
    for (const p of TREE_LEFT_PROPS) if (p in obj) return true;
    for (const p of TREE_RIGHT_PROPS) if (p in obj) return true;
    return false;
  }

  /**
   * DFS traversal that populates `nodes`.
   * Each call processes exactly one node, then recurses into children.
   */
  private _dfs(
    ref: string,
    heap: Record<string, HeapEntry>,
    nodes: Record<string, BinaryTreeNodeViz>,
    visited: Set<string>,
    depth: number,
  ): void {
    if (visited.has(ref) || Object.keys(nodes).length >= MAX_NODES) return;
    visited.add(ref);

    const entry = heap[ref];
    if (!entry || entry.kind !== "object") return;

    const obj = entry.value as Record<string, unknown>;

    // Resolve value
    let value: unknown = undefined;
    for (const p of TREE_VALUE_PROPS) {
      if (p in obj) { value = obj[p]; break; }
    }

    // Resolve left child ref
    let leftId: string | null = null;
    for (const p of TREE_LEFT_PROPS) {
      if (p in obj && isHeapRef(obj[p])) {
        leftId = obj[p] as string;
        break;
      }
    }

    // Resolve right child ref
    let rightId: string | null = null;
    for (const p of TREE_RIGHT_PROPS) {
      if (p in obj && isHeapRef(obj[p])) {
        rightId = obj[p] as string;
        break;
      }
    }

    nodes[ref] = { id: ref, value, leftId, rightId, depth };

    if (leftId) this._dfs(leftId, heap, nodes, visited, depth + 1);
    if (rightId) this._dfs(rightId, heap, nodes, visited, depth + 1);
  }
}
