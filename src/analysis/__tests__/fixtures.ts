/**
 * Test Fixtures
 *
 * Shared mock snapshots used across all detector tests.
 * Each fixture is a minimal `ExecutionSnapshot` in the Phase-5 heap-ref format.
 */

import type { ExecutionSnapshot, HeapEntry, StackFrame } from "../../types";

// ─── Helper ────────────────────────────────────────────────────────────────────

/**
 * Creates a minimal `ExecutionSnapshot` with sensible defaults.
 * Only `variables` and `heap` need to be specified for most tests.
 */
let _nextSnapshotId = 1;

export function makeSnapshot(
  variables: Record<string, unknown>,
  heap: Record<string, HeapEntry> = {},
  overrides: Partial<ExecutionSnapshot> = {},
): ExecutionSnapshot {
  return {
    id: _nextSnapshotId++,
    line: 1,
    variables,
    heap,
    callStack: [{ functionName: "<global>", line: null } satisfies StackFrame],
    console: [],
    timestamp: 0,
    executionContext: { currentFunction: "<global>", loopDepth: 0 },
    ...overrides,
  };
}

// ─── Array fixtures ────────────────────────────────────────────────────────────

/**
 * Two-sum: nums=[2,7,11,15], left=0, right=3, target=9
 */
export const twoSumSnapshot = makeSnapshot(
  { nums: "@h1", left: 0, right: 3, target: 9 },
  { "@h1": { id: "@h1", kind: "array", value: [2, 7, 11, 15] } },
);

/**
 * Sorting step: arr=[5,3,1,4,2], i=2, j=0
 */
export const sortSnapshot = makeSnapshot(
  { arr: "@h1", i: 2, j: 0 },
  { "@h1": { id: "@h1", kind: "array", value: [5, 3, 1, 4, 2] } },
);

// ─── Stack fixtures ────────────────────────────────────────────────────────────

export const stackSnapshot = makeSnapshot(
  { stack: "@h1", n: 5 },
  { "@h1": { id: "@h1", kind: "array", value: [1, 3, 5] } },
);

export const monoStackSnapshot = makeSnapshot(
  { monoStack: "@h1" },
  { "@h1": { id: "@h1", kind: "array", value: [2, 4, 6] } },
);

// ─── Queue fixtures ────────────────────────────────────────────────────────────

export const queueSnapshot = makeSnapshot(
  { queue: "@h1" },
  { "@h1": { id: "@h1", kind: "array", value: [10, 20, 30] } },
);

export const dequeSnapshot = makeSnapshot(
  { deque: "@h1" },
  { "@h1": { id: "@h1", kind: "array", value: [1, 2, 3] } },
);

// ─── HashMap fixtures ─────────────────────────────────────────────────────────

/** JS Map: { 2→0, 7→1 } */
export const jsMapSnapshot = makeSnapshot(
  { map: "@h1", target: 9 },
  { "@h1": { id: "@h1", kind: "map", value: [[2, 0], [7, 1]] } },
);

/** Plain object acting as hash map: { "2": 0, "7": 1 } */
export const plainObjMapSnapshot = makeSnapshot(
  { seen: "@h1" },
  { "@h1": { id: "@h1", kind: "object", value: { "2": 0, "7": 1 } } },
);

// ─── Linked List fixtures ──────────────────────────────────────────────────────

/** head → 1 → 2 → 3 → null */
export const linkedListSnapshot = makeSnapshot(
  { head: "@h1" },
  {
    "@h1": { id: "@h1", kind: "object", value: { val: 1, next: "@h2" } },
    "@h2": { id: "@h2", kind: "object", value: { val: 2, next: "@h3" } },
    "@h3": { id: "@h3", kind: "object", value: { val: 3, next: null } },
  },
);

/** Cyclic list: 1 → 2 → 3 → 1 (cycle back to @h1) */
export const cyclicListSnapshot = makeSnapshot(
  { head: "@h1" },
  {
    "@h1": { id: "@h1", kind: "object", value: { val: 1, next: "@h2" } },
    "@h2": { id: "@h2", kind: "object", value: { val: 2, next: "@h3" } },
    "@h3": { id: "@h3", kind: "object", value: { val: 3, next: "@h1" } },
  },
);

// ─── Binary Tree fixtures ──────────────────────────────────────────────────────

/**
 *       1
 *      / \
 *     2   3
 */
export const binaryTreeSnapshot = makeSnapshot(
  { root: "@h1" },
  {
    "@h1": {
      id: "@h1",
      kind: "object",
      value: { val: 1, left: "@h2", right: "@h3" },
    },
    "@h2": {
      id: "@h2",
      kind: "object",
      value: { val: 2, left: null, right: null },
    },
    "@h3": {
      id: "@h3",
      kind: "object",
      value: { val: 3, left: null, right: null },
    },
  },
);

// ─── Graph fixtures ────────────────────────────────────────────────────────────

/**
 * Undirected graph:
 *   0 — 1, 0 — 2
 *   1 — 0, 1 — 3
 */
export const undirectedGraphSnapshot = makeSnapshot(
  { graph: "@h1" },
  {
    "@h1": {
      id: "@h1",
      kind: "object",
      // All four nodes listed so every edge u→v has a reverse v→u (undirected)
      value: { "0": "@h2", "1": "@h3", "2": "@h5", "3": "@h4" },
    },
    "@h2": { id: "@h2", kind: "array", value: [1, 2] },  // 0 → [1, 2]
    "@h3": { id: "@h3", kind: "array", value: [0, 3] },  // 1 → [0, 3]
    "@h4": { id: "@h4", kind: "array", value: [1] },     // 3 → [1]
    "@h5": { id: "@h5", kind: "array", value: [0] },     // 2 → [0]  ← reverse of 0→2
  },
);

/**
 * Directed graph (0→1, 0→2, 1→3):
 */
export const directedGraphSnapshot = makeSnapshot(
  { g: "@h1" },
  {
    "@h1": {
      id: "@h1",
      kind: "object",
      value: { "0": "@h2", "1": "@h3" },
    },
    "@h2": { id: "@h2", kind: "array", value: [1, 2] },
    "@h3": { id: "@h3", kind: "array", value: [3] },
  },
);

// ─── Variable fixtures ─────────────────────────────────────────────────────────

export const primitivesSnapshot = makeSnapshot({
  target: 9,
  result: true,
  name: "hello",
  count: null,
});
