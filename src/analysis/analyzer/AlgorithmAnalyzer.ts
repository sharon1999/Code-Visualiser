/**
 * AlgorithmAnalyzer
 *
 * Orchestrates all detectors and produces a `VisualizationState` from an
 * `ExecutionSnapshot`.
 *
 * ### Design
 * 1. Builds an `AnalysisContext` once per snapshot (single traversal of
 *    `variables` + `heap`).
 * 2. Runs each registered detector's `supports()` gate — detectors that return
 *    `false` are skipped entirely.
 * 3. Routes each detector's output into the correct field of `VisualizationState`
 *    using the `type` discriminant.
 *
 * ### Extensibility
 * Injecting a new detector requires only:
 * ```ts
 * const analyzer = new AlgorithmAnalyzer([
 *   ...AlgorithmAnalyzer.defaultDetectors(),
 *   new TrieDetector(),
 * ]);
 * ```
 * No changes to existing detectors or this class body are needed.
 *
 * ### Performance
 * - Context is memoised by snapshot `id` (LRU with a small cap) so repeated
 *   calls for the same snapshot (e.g. when the user scrubs the timeline) avoid
 *   re-traversal.
 * - `supports()` guards prevent unnecessary `analyze()` calls.
 */

import type { ExecutionSnapshot } from "../../types";
import type {
  Detector,
  VisualizationResult,
  VisualizationState,
} from "../models/visualization";
import { buildContext } from "../utils/snapshotAccessor";
import type { AnalysisContext } from "../models/visualization";

import { ArrayDetector } from "../detectors/ArrayDetector";
import { PointerDetector } from "../detectors/PointerDetector";
import { HashMapDetector } from "../detectors/HashMapDetector";
import { StackDetector } from "../detectors/StackDetector";
import { QueueDetector } from "../detectors/QueueDetector";
import { LinkedListDetector } from "../detectors/LinkedListDetector";
import { TreeDetector } from "../detectors/TreeDetector";
import { GraphDetector } from "../detectors/GraphDetector";

// ─── LRU cache (tiny) ─────────────────────────────────────────────────────────

const CONTEXT_CACHE_SIZE = 50;

class LruCache<K, V> {
  private readonly _map = new Map<K, V>();
  constructor(private readonly _maxSize: number) {}

  get(key: K): V | undefined {
    const val = this._map.get(key);
    if (val !== undefined) {
      // Re-insert to mark as recently used
      this._map.delete(key);
      this._map.set(key, val);
    }
    return val;
  }

  set(key: K, value: V): void {
    if (this._map.has(key)) this._map.delete(key);
    this._map.set(key, value);
    if (this._map.size > this._maxSize) {
      const oldest = this._map.keys().next().value;
      if (oldest !== undefined) this._map.delete(oldest);
    }
  }
}

// ─── AlgorithmAnalyzer ────────────────────────────────────────────────────────

export class AlgorithmAnalyzer {
  private readonly _detectors: ReadonlyArray<Detector>;
  private readonly _contextCache = new LruCache<number, AnalysisContext>(
    CONTEXT_CACHE_SIZE,
  );

  /**
   * @param detectors - Optional list of detectors.  Defaults to
   *   `AlgorithmAnalyzer.defaultDetectors()`.  Pass a custom list to add,
   *   remove, or reorder detectors.
   */
  constructor(detectors?: Detector[]) {
    this._detectors = detectors ?? AlgorithmAnalyzer.defaultDetectors();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Analyses `snapshot` and returns the full `VisualizationState`.
   *
   * The returned object is **not** frozen — the UI layer may augment it with
   * rendering hints (e.g. colours for pointers) without cloning.
   */
  analyze(snapshot: ExecutionSnapshot): VisualizationState {
    const context = this._getOrBuildContext(snapshot);

    const state: VisualizationState = {
      arrays: [],
      hashMaps: [],
      stacks: [],
      queues: [],
      linkedLists: [],
      binaryTrees: [],
      graphs: [],
      variables: [],
      snapshotId: snapshot.id,
      line: snapshot.line,
      timestamp: snapshot.timestamp,
    };

    for (const detector of this._detectors) {
      if (!detector.supports(context)) continue;

      const results = detector.analyze(context);
      for (const result of results) {
        AlgorithmAnalyzer._route(result, state);
      }
    }

    return state;
  }

  /**
   * Returns the default detector pipeline.
   *
   * Ordering notes:
   * - Stack / Queue run before Array so that `ArrayDetector` can skip their names.
   * - LinkedList / Tree / Graph run before HashMap so `HashMapDetector` can rely
   *   on structural exclusion without re-checking those shapes.
   * - Pointer (variable) detector runs last as a catch-all for primitives.
   */
  static defaultDetectors(): Detector[] {
    return [
      new StackDetector(),
      new QueueDetector(),
      new LinkedListDetector(),
      new TreeDetector(),
      new GraphDetector(),
      new ArrayDetector(),
      new HashMapDetector(),
      new PointerDetector(),
    ];
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private _getOrBuildContext(snapshot: ExecutionSnapshot): AnalysisContext {
    const cached = this._contextCache.get(snapshot.id);
    if (cached) return cached;

    const context = buildContext(snapshot);
    this._contextCache.set(snapshot.id, context);
    return context;
  }

  /**
   * Routes a single `VisualizationResult` into the matching field of `state`.
   * TypeScript's exhaustiveness check ensures this stays in sync with the union.
   */
  private static _route(
    result: VisualizationResult,
    state: VisualizationState,
  ): void {
    switch (result.type) {
      case "array":       state.arrays.push(result);       break;
      case "hashmap":     state.hashMaps.push(result);     break;
      case "stack":       state.stacks.push(result);       break;
      case "queue":       state.queues.push(result);       break;
      case "linked-list": state.linkedLists.push(result);  break;
      case "binary-tree": state.binaryTrees.push(result);  break;
      case "graph":       state.graphs.push(result);       break;
      case "variable":    state.variables.push(result);    break;
      default: {
        // Exhaustiveness guard — TypeScript makes this unreachable at compile time
        const _exhaustive: never = result;
        console.warn("[AlgorithmAnalyzer] Unknown result type:", _exhaustive);
      }
    }
  }
}
