/**
 * Analysis Layer — Public Barrel
 *
 * Import the analyzer and all visualization types from here:
 *
 * ```ts
 * import { AlgorithmAnalyzer } from '@/analysis';
 * import type { VisualizationState } from '@/analysis';
 * ```
 */

export { AlgorithmAnalyzer } from "./analyzer/AlgorithmAnalyzer";

// All visualization model types
export type {
  VisualizationState,
  VisualizationResult,
  AnalysisContext,
  Detector,
  // Primitives
  PrimitiveValue,
  PrimitiveDataType,
  VariableVisualization,
  // Array
  ArrayPointer,
  ArrayVisualization,
  // HashMap
  HashMapEntry,
  HashMapVisualization,
  // Stack
  StackVisualization,
  // Queue
  QueueVisualization,
  // Linked list
  LinkedListNodeViz,
  LinkedListVisualization,
  // Binary tree
  BinaryTreeNodeViz,
  BinaryTreeVisualization,
  // Graph
  GraphNodeViz,
  GraphEdgeViz,
  GraphVisualization,
} from "./models/visualization";

// Individual detectors (for custom pipelines)
export { ArrayDetector } from "./detectors/ArrayDetector";
export { PointerDetector } from "./detectors/PointerDetector";
export { HashMapDetector } from "./detectors/HashMapDetector";
export { StackDetector } from "./detectors/StackDetector";
export { QueueDetector } from "./detectors/QueueDetector";
export { LinkedListDetector } from "./detectors/LinkedListDetector";
export { TreeDetector } from "./detectors/TreeDetector";
export { GraphDetector } from "./detectors/GraphDetector";

// Context builder (for custom detector implementations)
export { buildContext } from "./utils/snapshotAccessor";
