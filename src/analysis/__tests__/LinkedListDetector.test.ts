import { describe, it, expect } from "vitest";
import { LinkedListDetector } from "../detectors/LinkedListDetector";
import { buildContext } from "../utils/snapshotAccessor";
import {
  linkedListSnapshot,
  cyclicListSnapshot,
  twoSumSnapshot,
  binaryTreeSnapshot,
  makeSnapshot,
} from "./fixtures";

const detector = new LinkedListDetector();

describe("LinkedListDetector", () => {
  describe("supports()", () => {
    it("returns true for a linked-list snapshot", () => {
      expect(detector.supports(buildContext(linkedListSnapshot))).toBe(true);
    });

    it("returns false for a plain array snapshot", () => {
      expect(detector.supports(buildContext(twoSumSnapshot))).toBe(false);
    });

    it("returns false for a binary-tree snapshot", () => {
      // A tree has val+left/right but NOT val+next → should not match
      expect(detector.supports(buildContext(binaryTreeSnapshot))).toBe(false);
    });
  });

  describe("analyze() — linear list", () => {
    it("produces one LinkedListVisualization", () => {
      const results = detector.analyze(buildContext(linkedListSnapshot));
      expect(results).toHaveLength(1);
    });

    it("collects all three nodes in order", () => {
      const [result] = detector.analyze(buildContext(linkedListSnapshot));
      expect(result.nodes).toHaveLength(3);
      expect(result.nodes.map((n) => n.value)).toEqual([1, 2, 3]);
    });

    it("assigns correct indices", () => {
      const [result] = detector.analyze(buildContext(linkedListSnapshot));
      expect(result.nodes[0].index).toBe(0);
      expect(result.nodes[2].index).toBe(2);
    });

    it("reports hasCycle:false for a linear list", () => {
      const [result] = detector.analyze(buildContext(linkedListSnapshot));
      expect(result.hasCycle).toBe(false);
    });

    it("preserves heap refs in nodes", () => {
      const [result] = detector.analyze(buildContext(linkedListSnapshot));
      expect(result.nodes[0].heapRef).toBe("@h1");
      expect(result.nodes[1].heapRef).toBe("@h2");
    });
  });

  describe("analyze() — cyclic list", () => {
    it("detects the cycle", () => {
      const [result] = detector.analyze(buildContext(cyclicListSnapshot));
      expect(result.hasCycle).toBe(true);
    });

    it("collects nodes before the cycle without infinite loop", () => {
      const [result] = detector.analyze(buildContext(cyclicListSnapshot));
      // @h1 → @h2 → @h3 → (back to @h1, already visited)
      expect(result.nodes).toHaveLength(3);
    });
  });

  describe("analyze() — alternative property names", () => {
    it("handles 'value' instead of 'val'", () => {
      const snap = makeSnapshot(
        { head: "@h1" },
        {
          "@h1": {
            id: "@h1",
            kind: "object",
            value: { value: 42, next: null },
          },
        },
      );
      const [result] = detector.analyze(buildContext(snap));
      expect(result.nodes[0].value).toBe(42);
    });

    it("handles 'data' as the value property", () => {
      const snap = makeSnapshot(
        { head: "@h1" },
        {
          "@h1": {
            id: "@h1",
            kind: "object",
            value: { data: "A", next: null },
          },
        },
      );
      const [result] = detector.analyze(buildContext(snap));
      expect(result.nodes[0].value).toBe("A");
    });
  });
});
