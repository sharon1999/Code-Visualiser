import { describe, it, expect } from "vitest";
import { TreeDetector } from "../detectors/TreeDetector";
import { buildContext } from "../utils/snapshotAccessor";
import {
  binaryTreeSnapshot,
  linkedListSnapshot,
  twoSumSnapshot,
  makeSnapshot,
} from "./fixtures";

const detector = new TreeDetector();

describe("TreeDetector", () => {
  describe("supports()", () => {
    it("returns true for a binary tree snapshot", () => {
      expect(detector.supports(buildContext(binaryTreeSnapshot))).toBe(true);
    });

    it("returns false for a linked-list snapshot", () => {
      // Linked-list nodes have val+next, NOT val+left/right
      expect(detector.supports(buildContext(linkedListSnapshot))).toBe(false);
    });

    it("returns false for a plain array snapshot", () => {
      expect(detector.supports(buildContext(twoSumSnapshot))).toBe(false);
    });
  });

  describe("analyze()", () => {
    it("produces one BinaryTreeVisualization", () => {
      const results = detector.analyze(buildContext(binaryTreeSnapshot));
      expect(results).toHaveLength(1);
    });

    it("uses 'root' as the variable name", () => {
      const [result] = detector.analyze(buildContext(binaryTreeSnapshot));
      expect(result.name).toBe("root");
    });

    it("sets rootId to the root heap ref", () => {
      const [result] = detector.analyze(buildContext(binaryTreeSnapshot));
      expect(result.rootId).toBe("@h1");
    });

    it("collects all three nodes", () => {
      const [result] = detector.analyze(buildContext(binaryTreeSnapshot));
      expect(Object.keys(result.nodes)).toHaveLength(3);
    });

    it("root node has correct leftId and rightId", () => {
      const [result] = detector.analyze(buildContext(binaryTreeSnapshot));
      const root = result.nodes["@h1"];
      expect(root.value).toBe(1);
      expect(root.leftId).toBe("@h2");
      expect(root.rightId).toBe("@h3");
    });

    it("leaf nodes have null child ids", () => {
      const [result] = detector.analyze(buildContext(binaryTreeSnapshot));
      const left = result.nodes["@h2"];
      expect(left.leftId).toBeNull();
      expect(left.rightId).toBeNull();
    });

    it("assigns correct depth values", () => {
      const [result] = detector.analyze(buildContext(binaryTreeSnapshot));
      expect(result.nodes["@h1"].depth).toBe(0);
      expect(result.nodes["@h2"].depth).toBe(1);
      expect(result.nodes["@h3"].depth).toBe(1);
    });

    it("handles a deeper tree without infinite recursion", () => {
      const snap = makeSnapshot(
        { root: "@h1" },
        {
          "@h1": { id: "@h1", kind: "object", value: { val: 1, left: "@h2", right: null } },
          "@h2": { id: "@h2", kind: "object", value: { val: 2, left: "@h3", right: null } },
          "@h3": { id: "@h3", kind: "object", value: { val: 3, left: null, right: null } },
        },
      );
      const [result] = detector.analyze(buildContext(snap));
      expect(Object.keys(result.nodes)).toHaveLength(3);
      expect(result.nodes["@h3"].depth).toBe(2);
    });
  });
});
