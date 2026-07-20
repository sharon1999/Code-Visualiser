/**
 * Sample VisualizationState objects for manual testing and Storybook.
 * These cover every data structure the engine supports.
 */

import type { VisualizationState } from "../../analysis/models/visualization";

// ─── Arrays ───────────────────────────────────────────────────────────────────

export const SAMPLE_ARRAYS: VisualizationState = {
  snapshotId: 1,
  line: 4,
  timestamp: Date.now(),
  arrays: [
    {
      type: "array",
      name: "nums",
      values: [2, 7, 11, 15],
      pointers: [
        { name: "left",  index: 0 },
        { name: "right", index: 3 },
      ],
      highlighted: [1],
    },
    {
      type: "array",
      name: "dp",
      values: [0, 0, 0, 0, 1],
      pointers: [{ name: "i", index: 4 }],
      highlighted: [],
    },
  ],
  hashMaps: [],
  stacks: [],
  queues: [],
  linkedLists: [],
  binaryTrees: [],
  graphs: [],
  variables: [
    { type: "variable", name: "left",   value: 0,     dataType: "number",  isPointer: true  },
    { type: "variable", name: "right",  value: 3,     dataType: "number",  isPointer: true  },
    { type: "variable", name: "target", value: 9,     dataType: "number",  isPointer: false },
    { type: "variable", name: "found",  value: false, dataType: "boolean", isPointer: false },
  ],
};

// ─── HashMaps ─────────────────────────────────────────────────────────────────

export const SAMPLE_HASHMAPS: VisualizationState = {
  snapshotId: 2,
  line: 8,
  timestamp: Date.now(),
  arrays: [],
  hashMaps: [
    {
      type: "hashmap",
      name: "seen",
      kind: "Map",
      entries: [
        { key: 2,  value: 0 },
        { key: 7,  value: 1 },
        { key: 11, value: 2 },
      ],
    },
    {
      type: "hashmap",
      name: "freq",
      kind: "object",
      entries: [
        { key: "a", value: 3 },
        { key: "b", value: 1 },
        { key: "c", value: 2 },
      ],
    },
  ],
  stacks: [],
  queues: [],
  linkedLists: [],
  binaryTrees: [],
  graphs: [],
  variables: [
    { type: "variable", name: "target", value: 9, dataType: "number", isPointer: false },
  ],
};

// ─── Stack ────────────────────────────────────────────────────────────────────

export const SAMPLE_STACK: VisualizationState = {
  snapshotId: 3,
  line: 12,
  timestamp: Date.now(),
  arrays: [],
  hashMaps: [],
  stacks: [
    { type: "stack", name: "stack", items: [1, 3, 5, 8] },
    { type: "stack", name: "monoStack", items: [2, 4] },
  ],
  queues: [],
  linkedLists: [],
  binaryTrees: [],
  graphs: [],
  variables: [
    { type: "variable", name: "n", value: 5, dataType: "number", isPointer: false },
  ],
};

// ─── Queue ────────────────────────────────────────────────────────────────────

export const SAMPLE_QUEUE: VisualizationState = {
  snapshotId: 4,
  line: 16,
  timestamp: Date.now(),
  arrays: [],
  hashMaps: [],
  stacks: [],
  queues: [
    { type: "queue", name: "queue", items: [10, 20, 30, 40] },
    { type: "queue", name: "deque", items: ["A", "B", "C"] },
  ],
  linkedLists: [],
  binaryTrees: [],
  graphs: [],
  variables: [],
};

// ─── Linked List ──────────────────────────────────────────────────────────────

export const SAMPLE_LINKED_LIST: VisualizationState = {
  snapshotId: 5,
  line: 22,
  timestamp: Date.now(),
  arrays: [],
  hashMaps: [],
  stacks: [],
  queues: [],
  linkedLists: [
    {
      type: "linked-list",
      name: "head",
      nodes: [
        { index: 0, value: 1,  heapRef: "@h1" },
        { index: 1, value: 2,  heapRef: "@h2" },
        { index: 2, value: 3,  heapRef: "@h3" },
        { index: 3, value: 4,  heapRef: "@h4" },
      ],
      hasCycle: false,
    },
    {
      type: "linked-list",
      name: "cyclic",
      nodes: [
        { index: 0, value: "A", heapRef: "@hA" },
        { index: 1, value: "B", heapRef: "@hB" },
        { index: 2, value: "C", heapRef: "@hC" },
      ],
      hasCycle: true,
    },
  ],
  binaryTrees: [],
  graphs: [],
  variables: [],
};

// ─── Binary Tree ──────────────────────────────────────────────────────────────

export const SAMPLE_TREE: VisualizationState = {
  snapshotId: 6,
  line: 30,
  timestamp: Date.now(),
  arrays: [],
  hashMaps: [],
  stacks: [],
  queues: [],
  linkedLists: [],
  binaryTrees: [
    {
      type: "binary-tree",
      name: "root",
      rootId: "@h1",
      nodes: {
        "@h1": { id: "@h1", value: 1, leftId: "@h2", rightId: "@h3", depth: 0 },
        "@h2": { id: "@h2", value: 2, leftId: "@h4", rightId: "@h5", depth: 1 },
        "@h3": { id: "@h3", value: 3, leftId: null,  rightId: "@h6", depth: 1 },
        "@h4": { id: "@h4", value: 4, leftId: null,  rightId: null,  depth: 2 },
        "@h5": { id: "@h5", value: 5, leftId: null,  rightId: null,  depth: 2 },
        "@h6": { id: "@h6", value: 6, leftId: null,  rightId: null,  depth: 2 },
      },
    },
  ],
  graphs: [],
  variables: [],
};

// ─── Graph ────────────────────────────────────────────────────────────────────

export const SAMPLE_GRAPH: VisualizationState = {
  snapshotId: 7,
  line: 40,
  timestamp: Date.now(),
  arrays: [],
  hashMaps: [],
  stacks: [],
  queues: [],
  linkedLists: [],
  binaryTrees: [],
  graphs: [
    {
      type: "graph",
      name: "graph",
      directed: false,
      nodes: [
        { id: "0", label: "0" },
        { id: "1", label: "1" },
        { id: "2", label: "2" },
        { id: "3", label: "3" },
        { id: "4", label: "4" },
      ],
      edges: [
        { source: "0", target: "1" },
        { source: "0", target: "2" },
        { source: "1", target: "3" },
        { source: "2", target: "4" },
        { source: "3", target: "4" },
      ],
    },
    {
      type: "graph",
      name: "weighted",
      directed: true,
      nodes: [
        { id: "A", label: "A" },
        { id: "B", label: "B" },
        { id: "C", label: "C" },
      ],
      edges: [
        { source: "A", target: "B", weight: 4 },
        { source: "A", target: "C", weight: 2 },
        { source: "B", target: "C", weight: 1 },
      ],
    },
  ],
  variables: [],
};

// ─── Full mixed snapshot ───────────────────────────────────────────────────────

export const SAMPLE_FULL: VisualizationState = {
  snapshotId: 10,
  line: 7,
  timestamp: Date.now(),
  arrays: SAMPLE_ARRAYS.arrays,
  hashMaps: SAMPLE_HASHMAPS.hashMaps,
  stacks: SAMPLE_STACK.stacks,
  queues: SAMPLE_QUEUE.queues,
  linkedLists: SAMPLE_LINKED_LIST.linkedLists,
  binaryTrees: SAMPLE_TREE.binaryTrees,
  graphs: SAMPLE_GRAPH.graphs,
  variables: SAMPLE_ARRAYS.variables,
};

export const SAMPLES = {
  "Arrays + Pointers": SAMPLE_ARRAYS,
  "Hash Maps": SAMPLE_HASHMAPS,
  "Stacks": SAMPLE_STACK,
  "Queues": SAMPLE_QUEUE,
  "Linked Lists": SAMPLE_LINKED_LIST,
  "Binary Tree": SAMPLE_TREE,
  "Graphs": SAMPLE_GRAPH,
  "Everything": SAMPLE_FULL,
} as const;
