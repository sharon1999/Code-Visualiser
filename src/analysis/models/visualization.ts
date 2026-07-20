/**
 * Visualization Models — Phase 6
 *
 * Defines every data-structure visualization shape produced by the analyzer,
 * the `Detector` contract every detector must satisfy, and the `AnalysisContext`
 * that is pre-computed once per snapshot and shared across all detectors.
 *
 * This file is the single source of truth for all analysis-layer types.
 * No runtime code lives here — pure type definitions only.
 */

import type { ExecutionSnapshot, HeapEntry } from "../../types";

// ─── Primitive value ───────────────────────────────────────────────────────────

export type PrimitiveValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | bigint;

export type PrimitiveDataType =
  | "number"
  | "string"
  | "boolean"
  | "null"
  | "undefined"
  | "bigint";

// ─── Array ────────────────────────────────────────────────────────────────────

/**
 * An index-pointer variable that references a position inside an array.
 * Produced by the pointer-detection logic inside `ArrayDetector`.
 */
export interface ArrayPointer {
  /** The variable name (e.g. `"left"`, `"right"`, `"i"`). */
  name: string;
  /** The integer index value. */
  index: number;
  /**
   * Optional semantic color key consumed by the renderer.
   * Not set by detectors; UI layer assigns colours.
   */
  color?: string;
}

export interface ArrayVisualization {
  readonly type: "array";
  /** Variable name. */
  name: string;
  /** Element values (primitives, or heap-ref strings for nested objects). */
  values: unknown[];
  /** Pointer variables whose integer value is a valid index for this array. */
  pointers: ArrayPointer[];
  /** Indices to highlight (swap targets, current element, etc.). */
  highlighted: number[];
}

// ─── HashMap ──────────────────────────────────────────────────────────────────

export interface HashMapEntry {
  key: unknown;
  value: unknown;
}

export interface HashMapVisualization {
  readonly type: "hashmap";
  name: string;
  /** `"Map"` for JS Map instances, `"object"` for plain object hash maps. */
  kind: "Map" | "object";
  entries: HashMapEntry[];
}

// ─── Stack ────────────────────────────────────────────────────────────────────

export interface StackVisualization {
  readonly type: "stack";
  name: string;
  /** Items ordered bottom (index 0) → top (last index). */
  items: unknown[];
}

// ─── Queue ────────────────────────────────────────────────────────────────────

export interface QueueVisualization {
  readonly type: "queue";
  name: string;
  /** Items ordered front (index 0) → back (last index). */
  items: unknown[];
}

// ─── Linked List ──────────────────────────────────────────────────────────────

export interface LinkedListNodeViz {
  /** 0-based position in the traversal order. */
  index: number;
  value: unknown;
  /** Heap-ref string that uniquely identifies this node across snapshots. */
  heapRef: string;
}

export interface LinkedListVisualization {
  readonly type: "linked-list";
  name: string;
  nodes: LinkedListNodeViz[];
  /** `true` when a cycle was detected during traversal. */
  hasCycle: boolean;
}

// ─── Binary Tree ──────────────────────────────────────────────────────────────

export interface BinaryTreeNodeViz {
  /** The heap-ref string used as a stable node id. */
  id: string;
  value: unknown;
  /** id of the left child, or `null`. */
  leftId: string | null;
  /** id of the right child, or `null`. */
  rightId: string | null;
  /** 0-based depth in the tree (root = 0). */
  depth: number;
}

export interface BinaryTreeVisualization {
  readonly type: "binary-tree";
  name: string;
  /** Heap-ref id of the root node, or `null` for an empty tree. */
  rootId: string | null;
  /** All nodes keyed by their heap-ref id. */
  nodes: Record<string, BinaryTreeNodeViz>;
}

// ─── Graph ────────────────────────────────────────────────────────────────────

export interface GraphNodeViz {
  id: string;
  label: string;
}

export interface GraphEdgeViz {
  source: string;
  target: string;
  weight?: number;
}

export interface GraphVisualization {
  readonly type: "graph";
  name: string;
  nodes: GraphNodeViz[];
  edges: GraphEdgeViz[];
  /** `true` if the adjacency list implies directed edges. */
  directed: boolean;
}

// ─── Primitive Variable ───────────────────────────────────────────────────────

export interface VariableVisualization {
  readonly type: "variable";
  name: string;
  value: PrimitiveValue;
  dataType: PrimitiveDataType;
  /**
   * `true` when the variable's name matches a well-known pointer/index pattern
   * AND its value is a non-negative integer.
   */
  isPointer: boolean;
}

// ─── Union ────────────────────────────────────────────────────────────────────

export type VisualizationResult =
  | ArrayVisualization
  | HashMapVisualization
  | StackVisualization
  | QueueVisualization
  | LinkedListVisualization
  | BinaryTreeVisualization
  | GraphVisualization
  | VariableVisualization;

// ─── Complete state ────────────────────────────────────────────────────────────

/**
 * The complete visualization state produced from one `ExecutionSnapshot`.
 * This is the single data contract between the analysis layer and the UI layer.
 */
export interface VisualizationState {
  arrays: ArrayVisualization[];
  hashMaps: HashMapVisualization[];
  stacks: StackVisualization[];
  queues: QueueVisualization[];
  linkedLists: LinkedListVisualization[];
  binaryTrees: BinaryTreeVisualization[];
  graphs: GraphVisualization[];
  /** All primitive (non-reference) variables in scope. */
  variables: VariableVisualization[];

  // ── Metadata (mirrors the originating snapshot) ────────────────────────────
  snapshotId: number;
  line: number;
  timestamp: number;
}

// ─── Analysis context ─────────────────────────────────────────────────────────

/**
 * Pre-computed, read-only view of one `ExecutionSnapshot`.
 *
 * Built exactly once per snapshot by `buildContext()` in `snapshotAccessor.ts`
 * and shared with every detector.  Using the context avoids re-traversing
 * `snapshot.variables` and `snapshot.heap` inside each detector.
 */
export interface AnalysisContext {
  readonly snapshot: ExecutionSnapshot;

  /** Variable name → `{ ref, entry }` for every `kind:"array"` heap entry. */
  readonly arrayVars: ReadonlyMap<string, { ref: string; entry: HeapEntry }>;

  /** Variable name → `{ ref, entry }` for every `kind:"map"` heap entry. */
  readonly mapVars: ReadonlyMap<string, { ref: string; entry: HeapEntry }>;

  /** Variable name → `{ ref, entry }` for every `kind:"set"` heap entry. */
  readonly setVars: ReadonlyMap<string, { ref: string; entry: HeapEntry }>;

  /** Variable name → `{ ref, entry }` for every `kind:"object"` heap entry. */
  readonly objectVars: ReadonlyMap<string, { ref: string; entry: HeapEntry }>;

  /** Variable name → `{ ref, entry }` for every `kind:"function"` heap entry. */
  readonly functionVars: ReadonlyMap<string, { ref: string; entry: HeapEntry }>;

  /** Variable name → primitive value for all non-reference variables. */
  readonly primitiveVars: ReadonlyMap<string, PrimitiveValue>;

  /**
   * Subset of `primitiveVars` limited to finite integers ≥ 0.
   * Used by `ArrayDetector` and `PointerDetector` for index detection.
   */
  readonly nonNegativeIntVars: ReadonlyMap<string, number>;
}

// ─── Detector contract ────────────────────────────────────────────────────────

/**
 * Every data-structure detector must implement this interface.
 *
 * ### Extensibility guarantee
 * Adding a new detector requires **zero** changes to existing detectors:
 * 1. Implement `Detector<T>` in a new file under `detectors/`.
 * 2. Register it in `AlgorithmAnalyzer.defaultDetectors()`.
 *
 * ### Performance contract
 * - `supports()` MUST be O(1) or at worst O(n) in the number of variables.
 * - `analyze()` is only called when `supports()` returns `true`.
 * - Detectors must not mutate the context or snapshot.
 * - Detectors should not deep-clone values unless absolutely necessary.
 */
export interface Detector<
  T extends VisualizationResult = VisualizationResult,
> {
  /**
   * Unique identifier used for debugging and logging.
   * Convention: `"<DataStructure>Detector"`.
   */
  readonly id: string;

  /**
   * Returns `true` if the snapshot contains data this detector can process.
   * Called before `analyze()` as a fast rejection gate.
   */
  supports(context: AnalysisContext): boolean;

  /**
   * Inspects the context and returns zero or more visualization models.
   * Called only when `supports()` returns `true`.
   */
  analyze(context: AnalysisContext): T[];
}
