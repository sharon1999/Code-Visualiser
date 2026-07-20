import { describe, it, expect } from "vitest";
import { HashMapDetector } from "../detectors/HashMapDetector";
import { buildContext } from "../utils/snapshotAccessor";
import {
  jsMapSnapshot,
  plainObjMapSnapshot,
  linkedListSnapshot,
  binaryTreeSnapshot,
  undirectedGraphSnapshot,
  makeSnapshot,
} from "./fixtures";

const detector = new HashMapDetector();

describe("HashMapDetector", () => {
  describe("supports()", () => {
    it("returns true for a JS Map variable", () => {
      expect(detector.supports(buildContext(jsMapSnapshot))).toBe(true);
    });

    it("returns true for a plain object that looks like a map", () => {
      expect(detector.supports(buildContext(plainObjMapSnapshot))).toBe(true);
    });

    it("returns false for a linked-list snapshot", () => {
      expect(detector.supports(buildContext(linkedListSnapshot))).toBe(false);
    });

    it("returns false for a binary-tree snapshot", () => {
      expect(detector.supports(buildContext(binaryTreeSnapshot))).toBe(false);
    });

    it("returns false for a graph adjacency list", () => {
      expect(detector.supports(buildContext(undirectedGraphSnapshot))).toBe(
        false,
      );
    });
  });

  describe("analyze() — JS Map", () => {
    it("detects the map with correct kind", () => {
      const results = detector.analyze(buildContext(jsMapSnapshot));
      expect(results).toHaveLength(1);
      expect(results[0].kind).toBe("Map");
      expect(results[0].name).toBe("map");
    });

    it("emits the correct entries", () => {
      const [result] = detector.analyze(buildContext(jsMapSnapshot));
      expect(result.entries).toEqual([
        { key: 2, value: 0 },
        { key: 7, value: 1 },
      ]);
    });
  });

  describe("analyze() — plain object", () => {
    it("detects the object with kind 'object'", () => {
      const results = detector.analyze(buildContext(plainObjMapSnapshot));
      expect(results).toHaveLength(1);
      expect(results[0].kind).toBe("object");
      expect(results[0].name).toBe("seen");
    });

    it("coerces numeric-looking string keys to numbers", () => {
      const [result] = detector.analyze(buildContext(plainObjMapSnapshot));
      const keys = result.entries.map((e) => e.key);
      // "2" and "7" should become numbers 2 and 7
      expect(keys).toContain(2);
      expect(keys).toContain(7);
    });
  });

  describe("exclusion heuristics", () => {
    it("does not detect a linked-list node as a hashmap", () => {
      const snap = makeSnapshot(
        { head: "@h1" },
        { "@h1": { id: "@h1", kind: "object", value: { val: 1, next: null } } },
      );
      expect(detector.analyze(buildContext(snap))).toHaveLength(0);
    });

    it("does not detect a tree node as a hashmap", () => {
      const snap = makeSnapshot(
        { root: "@h1" },
        {
          "@h1": {
            id: "@h1",
            kind: "object",
            value: { val: 1, left: null, right: null },
          },
        },
      );
      expect(detector.analyze(buildContext(snap))).toHaveLength(0);
    });

    it("does not detect a graph adjacency list as a hashmap", () => {
      expect(
        detector.analyze(buildContext(undirectedGraphSnapshot)),
      ).toHaveLength(0);
    });
  });
});
