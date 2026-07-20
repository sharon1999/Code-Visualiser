/**
 * Naming Heuristics
 *
 * Centralised sets of variable-name patterns used by multiple detectors.
 * Keeping them here prevents duplication and makes it easy to extend.
 */

// ─── Pointer / index names ─────────────────────────────────────────────────────

/**
 * Variable names that commonly represent array index pointers.
 *
 * A variable is treated as a pointer when its name is in this set AND its
 * value is a non-negative integer that is a valid index for at least one array
 * in scope.
 */
export const POINTER_NAMES = new Set<string>([
  // Classic loop counters
  "i", "j", "k", "l", "m", "n",
  // Generic pointers / cursors
  "p", "q", "r", "ptr", "pointer",
  "cur", "curr", "current",
  "prev", "nxt",
  // Two-pointer idiom
  "left", "right", "lo", "hi", "low", "high",
  "start", "end", "begin", "finish",
  "slow", "fast",
  // Binary-search
  "mid", "middle",
  // Partition / pivot
  "pivot", "pivotIdx", "pivot_idx",
  // Named positions
  "head", "tail", "front", "back", "top", "bottom",
  "index", "idx", "pos", "position",
  // Matrix
  "row", "col", "column",
  // Misc
  "ans", "res",
]);

// ─── Stack names ───────────────────────────────────────────────────────────────

/**
 * Variable names that indicate an array is being used as a stack.
 */
export const STACK_NAMES = new Set<string>([
  "stack", "stk", "s",
  "monoStack", "monotonicStack", "monotoneStack",
  "monoStk", "minStack", "maxStack",
  "callStack", "dfsStack",
  "history",
]);

// ─── Queue names ───────────────────────────────────────────────────────────────

/**
 * Variable names that indicate an array is being used as a queue.
 */
export const QUEUE_NAMES = new Set<string>([
  "queue", "q",
  "deque", "dq",
  "bfsQueue", "bfs",
  "pq", "minHeap", "maxHeap", "heap",
  "worklist", "todo",
]);

// ─── Linked-list node property names ──────────────────────────────────────────

/** Property names that carry a node's primary value. */
export const LL_VALUE_PROPS = new Set<string>(["val", "value", "data"]);

/** Property names that point to the next node. */
export const LL_NEXT_PROPS = new Set<string>(["next", "nxt"]);

// ─── Tree node property names ─────────────────────────────────────────────────

/** Property names that carry a tree node's primary value. */
export const TREE_VALUE_PROPS = new Set<string>([
  "val", "value", "data", "key",
]);

/** Property names that point to the left child. */
export const TREE_LEFT_PROPS = new Set<string>(["left", "l"]);

/** Property names that point to the right child. */
export const TREE_RIGHT_PROPS = new Set<string>(["right", "r"]);

// ─── Graph variable names ──────────────────────────────────────────────────────

/**
 * Variable names that suggest a graph adjacency structure.
 * Used as a secondary hint after the structural check.
 */
export const GRAPH_NAMES = new Set<string>([
  "graph", "g",
  "adj", "adjList", "adjacency", "adjacencyList",
  "edges", "neighbors", "neighbours",
]);
