import { describe, it, expect } from "vitest";
import { GraphDetector } from "../detectors/GraphDetector";
import { buildContext } from "../utils/snapshotAccessor";
import {
  undirectedGraphSnapshot,
  directedGraphSnapshot,
  twoSumSnapshot,
  jsMapSnapshot,
  makeSnapshot,
} from "./fixtures";

const detector = new GraphDetector();

describe("GraphDetector", () => {
  describe("supports()", () => {
    it("returns true for a graph adjacency list", () => {
      expect(detector.supports(buildContext(undirectedGraphSnapshot))).toBe(
        true,
      );
    });

    it("returns false for a plain array snapshot", () => {
      expect(detector.supports(buildContext(twoSumSnapshot))).toBe(false);
    });

    it("returns false for a plain hashmap (primitive values)", () => {
      expect(detector.supports(buildContext(jsMapSnapshot))).toBe(false);
    });
  });

  describe("analyze() — undirected", () => {
    it("produces one GraphVisualization", () => {
      expect(
        detector.analyze(buildContext(undirectedGraphSnapshot)),
      ).toHaveLength(1);
    });

    it("correctly identifies the graph as undirected", () => {
      const [result] = detector.analyze(buildContext(undirectedGraphSnapshot));
      expect(result.directed).toBe(false);
    });

    it("collects all unique nodes", () => {
      const [result] = detector.analyze(buildContext(undirectedGraphSnapshot));
      const ids = result.nodes.map((n) => n.id).sort();
      // Keys "0","1","3" + neighbour "2" from "0":"[1,2]"
      expect(ids).toContain("0");
      expect(ids).toContain("1");
      expect(ids).toContain("2");
    });

    it("de-duplicates undirected edges", () => {
      const [result] = detector.analyze(buildContext(undirectedGraphSnapshot));
      // No edge should appear twice
      const edgeStrs = result.edges.map((e) => `${e.source}↔${e.target}`);
      const uniqueEdges = new Set(edgeStrs);
      expect(edgeStrs.length).toBe(uniqueEdges.size);
    });
  });

  describe("analyze() — directed", () => {
    it("correctly identifies the graph as directed", () => {
      const [result] = detector.analyze(buildContext(directedGraphSnapshot));
      expect(result.directed).toBe(true);
    });

    it("preserves all directed edges", () => {
      const [result] = detector.analyze(buildContext(directedGraphSnapshot));
      // 0→1, 0→2, 1→3
      expect(result.edges).toHaveLength(3);
    });
  });

  describe("edge cases", () => {
    it("returns empty array for an empty object", () => {
      const snap = makeSnapshot(
        { g: "@h1" },
        { "@h1": { id: "@h1", kind: "object", value: {} } },
      );
      expect(detector.analyze(buildContext(snap))).toHaveLength(0);
    });
  });
});
