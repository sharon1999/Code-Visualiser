import { describe, it, expect } from "vitest";
import { QueueDetector } from "../detectors/QueueDetector";
import { buildContext } from "../utils/snapshotAccessor";
import { queueSnapshot, dequeSnapshot, twoSumSnapshot, makeSnapshot } from "./fixtures";

const detector = new QueueDetector();

describe("QueueDetector", () => {
  describe("supports()", () => {
    it("returns true for 'queue'", () => {
      expect(detector.supports(buildContext(queueSnapshot))).toBe(true);
    });

    it("returns true for 'deque'", () => {
      expect(detector.supports(buildContext(dequeSnapshot))).toBe(true);
    });

    it("returns false for a generic array", () => {
      expect(detector.supports(buildContext(twoSumSnapshot))).toBe(false);
    });
  });

  describe("analyze()", () => {
    it("returns items front-to-back", () => {
      const [result] = detector.analyze(buildContext(queueSnapshot));
      expect(result.type).toBe("queue");
      expect(result.items).toEqual([10, 20, 30]);
    });

    it("preserves the variable name", () => {
      const [result] = detector.analyze(buildContext(dequeSnapshot));
      expect(result.name).toBe("deque");
    });

    it("detects 'q' as a queue", () => {
      const snap = makeSnapshot(
        { q: "@h1" },
        { "@h1": { id: "@h1", kind: "array", value: [5, 6] } },
      );
      const [result] = detector.analyze(buildContext(snap));
      expect(result.name).toBe("q");
    });

    it("returns empty array for non-queue snapshots", () => {
      expect(detector.analyze(buildContext(twoSumSnapshot))).toHaveLength(0);
    });
  });
});
