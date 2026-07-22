import { describe, it, expect } from "vitest";
import { transformCode } from "../transformer";

const TWO_SUM = `
function twoSum(nums, target) {
  let left = 0;
  let right = nums.length - 1;
  while (left < right) {
    const sum = nums[left] + nums[right];
    if (sum === target) return [left, right];
    else if (sum < target) left++;
    else right--;
  }
  return [];
}
const nums = [2, 7, 11, 15];
twoSum(nums, 9);
`;

describe("transformCode", () => {
  it("transforms twoSum without stack overflow", () => {
    expect(() => transformCode(TWO_SUM)).not.toThrow();
  });

  it("succeeds and produces capturePoints", () => {
    const result = transformCode(TWO_SUM);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.capturePoints.length).toBeGreaterThan(0);
  });

  it("injects __enterLoop and __exitLoop", () => {
    const result = transformCode(TWO_SUM);
    if (!result.success) return;
    expect(result.transformedCode).toContain("__enterLoop");
    expect(result.transformedCode).toContain("__exitLoop");
  });

  it("produces multiple __capture calls", () => {
    const result = transformCode(TWO_SUM);
    if (!result.success) return;
    const captureCount = (result.transformedCode.match(/__capture\(/g) ?? []).length;
    expect(captureCount).toBeGreaterThan(3);
  });

  it("transformed code executes in a sandboxed Function() and tracks vars", () => {
    const result = transformCode(TWO_SUM);
    if (!result.success) return;
    const snapshots: number[] = [];
    const varStore = new Map<string, unknown>();
    const sandbox = new Function(
      "console", "__capture", "__trackVar",
      "__enterScope", "__exitScope", "__enterLoop", "__exitLoop",
      result.transformedCode,
    );
    expect(() =>
      sandbox(
        { log: () => {}, warn: () => {}, error: () => {} },
        (step: number) => { snapshots.push(step); },
        (name: string, val: unknown) => { varStore.set(name, val); },
        () => {}, () => {}, () => {}, () => {},
      )
    ).not.toThrow();
    expect(snapshots.length).toBeGreaterThan(0);
    expect(varStore.has("left")).toBe(true);
    expect(varStore.has("right")).toBe(true);
  });

  it("handles a for-loop without stack overflow", () => {
    const result = transformCode("for (let i = 0; i < 3; i++) { const x = i; }");
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.transformedCode).toContain("__enterLoop");
  });
});
