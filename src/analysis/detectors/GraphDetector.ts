/**
 * GraphDetector
 *
 * Detects graph adjacency-list structures.
 *
 * A plain object is treated as an adjacency list when **all** of its property
 * values are heap refs pointing to `kind: "array"` entries.
 *
 * Example (after Phase-5 serialisation):
 * ```
 * { "0": "@h2", "1": "@h3", "2": "@h4" }   // object with array-valued props
 * "@h2" → { kind:"array", value: [1, 2] }   // neighbour list of node 0
 * "@h3" → { kind:"array", value: [0, 3] }
 * "@h4" → { kind:"array", value: [0] }
 * ```
 *
 * Produces:
 *   nodes: [{ id:"0" }, { id:"1" }, { id:"2" }, { id:"3" }]
 *   edges: [0→1, 0→2, 1→0, 1→3, 2→0]
 *
 * Directed detection heuristic: the graph is considered **undirected** when
 * every edge (u → v) has a corresponding reverse edge (v → u).  Otherwise
 * it is marked directed.
 */

import type {
  AnalysisContext,
  Detector,
  GraphEdgeViz,
  GraphNodeViz,
  GraphVisualization,
} from "../models/visualization";
import type { HeapEntry } from "../../types";
import { isHeapRef } from "../utils/snapshotAccessor";

export class GraphDetector implements Detector<GraphVisualization> {
  readonly id = "GraphDetector";

  supports(context: AnalysisContext): boolean {
    for (const [, { entry }] of context.objectVars) {
      if (this._isAdjList(entry, context)) return true;
    }
    return false;
  }

  analyze(context: AnalysisContext): GraphVisualization[] {
    const results: GraphVisualization[] = [];
    const heap = context.snapshot.heap;

    for (const [name, { entry }] of context.objectVars) {
      if (!this._isAdjList(entry, context)) continue;

      const obj = entry.value as Record<string, unknown>;

      // Collect all explicit nodes from keys
      const nodeSet = new Set<string>();
      const edges: GraphEdgeViz[] = [];

      for (const [srcKey, neighbourRef] of Object.entries(obj)) {
        nodeSet.add(srcKey);

        const neighbourEntry = heap[neighbourRef as string];
        if (!neighbourEntry || neighbourEntry.kind !== "array") continue;

        const neighbours = neighbourEntry.value as unknown[];
        for (const neighbour of neighbours) {
          const target = String(neighbour);
          nodeSet.add(target);
          edges.push({ source: srcKey, target });
        }
      }

      // Determine directed vs undirected
      const edgeSet = new Set(edges.map((e) => `${e.source}→${e.target}`));
      const directed = edges.some(
        (e) => !edgeSet.has(`${e.target}→${e.source}`),
      );

      // Remove duplicate edges for undirected graphs
      const finalEdges = directed
        ? edges
        : this._deduplicateUndirected(edges);

      const nodes: GraphNodeViz[] = [...nodeSet].map((id) => ({
        id,
        label: id,
      }));

      results.push({ type: "graph", name, nodes, edges: finalEdges, directed });
    }

    return results;
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  /**
   * Returns `true` when all property values of `entry.value` are heap refs
   * that point to `kind: "array"` entries.
   * An object with zero properties does NOT qualify.
   */
  private _isAdjList(
    entry: HeapEntry,
    context: AnalysisContext,
  ): boolean {
    if (entry.kind !== "object") return false;
    const obj = entry.value as Record<string, unknown>;
    const values = Object.values(obj);
    if (values.length === 0) return false;

    const heap = context.snapshot.heap;
    return values.every(
      (v) => isHeapRef(v) && heap[v as string]?.kind === "array",
    );
  }

  /**
   * For undirected graphs, keep only one direction of each edge pair
   * (lexicographically smaller source first).
   */
  private _deduplicateUndirected(edges: GraphEdgeViz[]): GraphEdgeViz[] {
    const seen = new Set<string>();
    const result: GraphEdgeViz[] = [];

    for (const edge of edges) {
      const [a, b] = [edge.source, edge.target].sort();
      const key = `${a}↔${b}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(edge);
      }
    }

    return result;
  }
}
