import { describe, it, expect } from "vitest";
import { AlgorithmAnalyzer } from "../analyzer/AlgorithmAnalyzer";
import {
  twoSumSnapshot,
  jsMapSnapshot,
  stackSnapshot,
  queueSnapshot,
  linkedListSnapshot,
  binaryTreeSnapshot,
  undirectedGraphSnapshot,
  primitivesSnapshot,
  makeSnapshot,
} from "./fixtures";

const analyzer = new AlgorithmAnalyzer();

describe("AlgorithmAnalyzer", () => {
  describe("metadata", () => {
    it("mirrors snapshotId, line, and timestamp from the snapshot", () => {
      const snap = makeSnapshot({}, {}, { id: 42, line: 7, timestamp: 12345 });
      const state = analyzer.analyze(snap);
      expect(state.snapshotId).toBe(42);
      expect(state.line).toBe(7);
      expect(state.timestamp).toBe(12345);
    });
  });

  describe("array pipeline", () => {
    it("produces arrays for generic array variables", () => {
      const state = analyzer.analyze(twoSumSnapshot);
      expect(state.arrays).toHaveLength(1);
      expect(state.arrays[0].name).toBe("nums");
    });

    it("does NOT put a stack-named array in 'arrays'", () => {
      const state = analyzer.analyze(stackSnapshot);
      expect(state.arrays.map((a) => a.name)).not.toContain("stack");
    });

    it("places stack-named array in 'stacks'", () => {
      const state = analyzer.analyze(stackSnapshot);
      expect(state.stacks).toHaveLength(1);
      expect(state.stacks[0].name).toBe("stack");
    });

    it("places queue-named array in 'queues'", () => {
      const state = analyzer.analyze(queueSnapshot);
      expect(state.queues).toHaveLength(1);
    });
  });

  describe("hashmap pipeline", () => {
    it("detects JS Map", () => {
      const state = analyzer.analyze(jsMapSnapshot);
      expect(state.hashMaps).toHaveLength(1);
      expect(state.hashMaps[0].kind).toBe("Map");
    });
  });

  describe("linked-list pipeline", () => {
    it("populates linkedLists", () => {
      const state = analyzer.analyze(linkedListSnapshot);
      expect(state.linkedLists).toHaveLength(1);
      expect(state.linkedLists[0].nodes).toHaveLength(3);
    });
  });

  describe("tree pipeline", () => {
    it("populates binaryTrees", () => {
      const state = analyzer.analyze(binaryTreeSnapshot);
      expect(state.binaryTrees).toHaveLength(1);
    });
  });

  describe("graph pipeline", () => {
    it("populates graphs", () => {
      const state = analyzer.analyze(undirectedGraphSnapshot);
      expect(state.graphs).toHaveLength(1);
    });
  });

  describe("variable pipeline", () => {
    it("captures all primitive variables", () => {
      const state = analyzer.analyze(primitivesSnapshot);
      const names = state.variables.map((v) => v.name).sort();
      expect(names).toEqual(["count", "name", "result", "target"].sort());
    });

    it("includes pointer annotation on 'left' and 'right'", () => {
      const state = analyzer.analyze(twoSumSnapshot);
      const pointers = state.variables.filter((v) => v.isPointer);
      const names = pointers.map((v) => v.name).sort();
      expect(names).toContain("left");
      expect(names).toContain("right");
    });
  });

  describe("context memoisation", () => {
    it("returns the same VisualizationState structure for repeated calls", () => {
      const first = analyzer.analyze(twoSumSnapshot);
      const second = analyzer.analyze(twoSumSnapshot);
      // Both calls should produce equivalent results
      expect(first.arrays).toHaveLength(second.arrays.length);
      expect(first.variables).toHaveLength(second.variables.length);
    });
  });

  describe("custom detector injection", () => {
    it("accepts an empty detector list without throwing", () => {
      const empty = new AlgorithmAnalyzer([]);
      const state = empty.analyze(twoSumSnapshot);
      // All arrays should be empty when no detectors run
      expect(state.arrays).toHaveLength(0);
      expect(state.variables).toHaveLength(0);
    });
  });

  describe("mixed snapshot", () => {
    it("correctly routes all data structures in one snapshot", () => {
      const snap = makeSnapshot(
        {
          nums: "@h1",
          stack: "@h2",
          map: "@h3",
          head: "@h4",
          target: 9,
          left: 0,
        },
        {
          "@h1": { id: "@h1", kind: "array", value: [2, 7, 11] },
          "@h2": { id: "@h2", kind: "array", value: [1, 2] },
          "@h3": { id: "@h3", kind: "map", value: [[2, 0]] },
          "@h4": {
            id: "@h4",
            kind: "object",
            value: { val: 1, next: null },
          },
        },
      );
      const state = analyzer.analyze(snap);
      expect(state.arrays).toHaveLength(1);      // nums
      expect(state.stacks).toHaveLength(1);       // stack
      expect(state.hashMaps).toHaveLength(1);     // map
      expect(state.linkedLists).toHaveLength(1);  // head
      expect(state.variables.length).toBeGreaterThanOrEqual(2); // target, left
    });
  });
});
