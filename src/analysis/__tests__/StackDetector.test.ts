import { describe, it, expect } from "vitest";
import { StackDetector } from "../detectors/StackDetector";
import { buildContext } from "../utils/snapshotAccessor";
import { stackSnapshot, monoStackSnapshot, twoSumSnapshot, makeSnapshot } from "./fixtures";

const detector = new StackDetector();

describe("StackDetector", () => {
  describe("supports()", () => {
    it("returns true for a 'stack' variable", () => {
      expect(detector.supports(buildContext(stackSnapshot))).toBe(true);
    });

    it("returns true for 'monoStack'", () => {
      expect(detector.supports(buildContext(monoStackSnapshot))).toBe(true);
    });

    it("returns false for a generic array (e.g. nums)", () => {
      expect(detector.supports(buildContext(twoSumSnapshot))).toBe(false);
    });
  });

  describe("analyze()", () => {
    it("returns items bottom-to-top", () => {
      const [result] = detector.analyze(buildContext(stackSnapshot));
      expect(result.type).toBe("stack");
      expect(result.items).toEqual([1, 3, 5]);
    });

    it("preserves variable name", () => {
      const [result] = detector.analyze(buildContext(monoStackSnapshot));
      expect(result.name).toBe("monoStack");
    });

    it("detects multiple stack variables in one snapshot", () => {
      const snap = makeSnapshot(
        { stack: "@h1", stk: "@h2" },
        {
          "@h1": { id: "@h1", kind: "array", value: [1] },
          "@h2": { id: "@h2", kind: "array", value: [2] },
        },
      );
      expect(detector.analyze(buildContext(snap))).toHaveLength(2);
    });

    it("returns empty array for non-stack snapshots", () => {
      expect(detector.analyze(buildContext(twoSumSnapshot))).toHaveLength(0);
    });
  });
});
