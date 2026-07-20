/**
 * PointerDetector
 *
 * Responsible for the `variables` field of `VisualizationState`.
 *
 * Returns every **primitive** variable as a `VariableVisualization`, flagging
 * those whose name matches a known index-pointer pattern (e.g. `left`, `i`,
 * `mid`) with `isPointer: true`.
 *
 * Note: heap-reference variables (arrays, objects, maps …) are handled by their
 * own detectors and therefore do NOT appear in the `variables` output.
 */

import type {
  AnalysisContext,
  Detector,
  PrimitiveDataType,
  PrimitiveValue,
  VariableVisualization,
} from "../models/visualization";
import { getPrimitiveDataType } from "../utils/snapshotAccessor";
import { POINTER_NAMES } from "../utils/naming";

export class PointerDetector implements Detector<VariableVisualization> {
  readonly id = "PointerDetector";

  supports(context: AnalysisContext): boolean {
    return context.primitiveVars.size > 0;
  }

  analyze(context: AnalysisContext): VariableVisualization[] {
    const results: VariableVisualization[] = [];

    for (const [name, value] of context.primitiveVars) {
      const dataType: PrimitiveDataType = getPrimitiveDataType(
        value as PrimitiveValue,
      );
      const isPointer =
        dataType === "number" &&
        typeof value === "number" &&
        Number.isInteger(value) &&
        value >= 0 &&
        POINTER_NAMES.has(name);

      results.push({ type: "variable", name, value, dataType, isPointer });
    }

    return results;
  }
}
