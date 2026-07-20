import { describe, it, expect } from "vitest";
import { PointerDetector } from "../detectors/PointerDetector";
import { buildContext } from "../utils/snapshotAccessor";
import { makeSnapshot, primitivesSnapshot } from "./fixtures";

const detector = new PointerDetector();

describe("PointerDetector", () => {
  describe("supports()", () => {
    it("returns true when there are primitive variables", () => {
      expect(detector.supports(buildContext(primitivesSnapshot))).toBe(true);
    });

    it("returns false for a snapshot with no primitives", () => {
      const snap = makeSnapshot(
        { arr: "@h1" },
        { "@h1": { id: "@h1", kind: "array", value: [] } },
      );
      expect(detector.supports(buildContext(snap))).toBe(false);
    });
  });

  describe("analyze()", () => {
    it("produces a VariableVisualization for each primitive", () => {
      const ctx = buildContext(primitivesSnapshot);
      const results = detector.analyze(ctx);
      const names = results.map((r) => r.name).sort();
      expect(names).toEqual(["count", "name", "result", "target"].sort());
    });

    it("tags pointer-named non-negative integer variables as isPointer:true", () => {
      const snap = makeSnapshot({ left: 0, right: 3, i: 1 });
      const ctx = buildContext(snap);
      const results = detector.analyze(ctx);
      const pointerVars = results.filter((r) => r.isPointer);
      const names = pointerVars.map((r) => r.name).sort();
      expect(names).toEqual(["i", "left", "right"].sort());
    });

    it("does NOT tag negative integers as pointers", () => {
      const snap = makeSnapshot({ i: -1 });
      const ctx = buildContext(snap);
      const [result] = detector.analyze(ctx);
      expect(result.isPointer).toBe(false);
    });

    it("does NOT tag non-pointer named integers as isPointer", () => {
      const snap = makeSnapshot({ target: 9, count: 3 });
      const ctx = buildContext(snap);
      const results = detector.analyze(ctx);
      results.forEach((r) => expect(r.isPointer).toBe(false));
    });

    it("correctly maps dataType for each primitive kind", () => {
      const snap = makeSnapshot({
        n: 42,
        s: "hello",
        b: true,
        nu: null,
      });
      const ctx = buildContext(snap);
      const results = detector.analyze(ctx);
      const byName = Object.fromEntries(results.map((r) => [r.name, r]));

      expect(byName["n"].dataType).toBe("number");
      expect(byName["s"].dataType).toBe("string");
      expect(byName["b"].dataType).toBe("boolean");
      expect(byName["nu"].dataType).toBe("null");
    });

    it("preserves the raw primitive value", () => {
      const snap = makeSnapshot({ target: 9 });
      const [result] = detector.analyze(buildContext(snap));
      expect(result.value).toBe(9);
    });
  });
});
