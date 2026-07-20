import { describe, it, expect } from "vitest";
import { ArrayDetector } from "../detectors/ArrayDetector";
import { buildContext } from "../utils/snapshotAccessor";
import {
  makeSnapshot,
  twoSumSnapshot,
  sortSnapshot,
  stackSnapshot,
  queueSnapshot,
} from "./fixtures";

const detector = new ArrayDetector();

describe("ArrayDetector", () => {
  describe("supports()", () => {
    it("returns true when a non-stack/queue array exists", () => {
      const ctx = buildContext(twoSumSnapshot);
      expect(detector.supports(ctx)).toBe(true);
    });

    it("returns false when only stack-named arrays exist", () => {
      const ctx = buildContext(stackSnapshot);
      expect(detector.supports(ctx)).toBe(false);
    });

    it("returns false when only queue-named arrays exist", () => {
      const ctx = buildContext(queueSnapshot);
      expect(detector.supports(ctx)).toBe(false);
    });

    it("returns false when there are no arrays at all", () => {
      const snap = makeSnapshot({ x: 5, y: 10 });
      expect(detector.supports(buildContext(snap))).toBe(false);
    });
  });

  describe("analyze()", () => {
    it("detects a simple integer array", () => {
      const ctx = buildContext(twoSumSnapshot);
      const results = detector.analyze(ctx);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        type: "array",
        name: "nums",
        values: [2, 7, 11, 15],
      });
    });

    it("attaches valid pointer annotations", () => {
      const ctx = buildContext(twoSumSnapshot);
      const [arr] = detector.analyze(ctx);
      const pointerNames = arr.pointers.map((p) => p.name);
      // left=0 and right=3 are both valid indices for nums (len=4)
      expect(pointerNames).toContain("left");
      expect(pointerNames).toContain("right");
    });

    it("sorts pointers by index then name", () => {
      const ctx = buildContext(sortSnapshot);
      const [arr] = detector.analyze(ctx);
      const indices = arr.pointers.map((p) => p.index);
      for (let k = 1; k < indices.length; k++) {
        expect(indices[k]).toBeGreaterThanOrEqual(indices[k - 1]);
      }
    });

    it("does NOT include target (9) as a pointer — out of range", () => {
      const ctx = buildContext(twoSumSnapshot);
      const [arr] = detector.analyze(ctx);
      const pointerNames = arr.pointers.map((p) => p.name);
      expect(pointerNames).not.toContain("target");
    });

    it("returns empty highlighted array by default", () => {
      const ctx = buildContext(twoSumSnapshot);
      const [arr] = detector.analyze(ctx);
      expect(arr.highlighted).toEqual([]);
    });

    it("detects multiple arrays in the same snapshot", () => {
      const snap = makeSnapshot(
        { nums: "@h1", dp: "@h2" },
        {
          "@h1": { id: "@h1", kind: "array", value: [1, 2, 3] },
          "@h2": { id: "@h2", kind: "array", value: [0, 0, 0] },
        },
      );
      const ctx = buildContext(snap);
      const results = detector.analyze(ctx);
      expect(results).toHaveLength(2);
    });

    it("excludes stack-named arrays", () => {
      const snap = makeSnapshot(
        { nums: "@h1", stack: "@h2" },
        {
          "@h1": { id: "@h1", kind: "array", value: [1, 2] },
          "@h2": { id: "@h2", kind: "array", value: [3, 4] },
        },
      );
      const ctx = buildContext(snap);
      const results = detector.analyze(ctx);
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("nums");
    });

    it("handles an empty array gracefully", () => {
      const snap = makeSnapshot(
        { arr: "@h1" },
        { "@h1": { id: "@h1", kind: "array", value: [] } },
      );
      const ctx = buildContext(snap);
      const results = detector.analyze(ctx);
      expect(results).toHaveLength(1);
      expect(results[0].pointers).toHaveLength(0);
    });
  });
});
