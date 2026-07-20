/**
 * ArrayDetector
 *
 * Detects every array variable in scope and annotates it with any index-pointer
 * variables whose value is a valid index into that array.
 *
 * Deliberately skips arrays already claimed by `StackDetector` and
 * `QueueDetector` (identified by variable name) to keep `VisualizationState`
 * clean — those structures appear in their own fields, not in `arrays`.
 */

import type {
  AnalysisContext,
  ArrayPointer,
  ArrayVisualization,
  Detector,
} from "../models/visualization";
import { POINTER_NAMES, QUEUE_NAMES, STACK_NAMES } from "../utils/naming";

export class ArrayDetector implements Detector<ArrayVisualization> {
  readonly id = "ArrayDetector";

  supports(context: AnalysisContext): boolean {
    // At least one array variable that is not a stack or queue
    for (const name of context.arrayVars.keys()) {
      if (!STACK_NAMES.has(name) && !QUEUE_NAMES.has(name)) return true;
    }
    return false;
  }

  analyze(context: AnalysisContext): ArrayVisualization[] {
    const results: ArrayVisualization[] = [];

    for (const [name, { entry }] of context.arrayVars) {
      // Let Stack / Queue detectors own their named arrays
      if (STACK_NAMES.has(name) || QUEUE_NAMES.has(name)) continue;

      const values = entry.value as unknown[];
      const pointers = this._buildPointers(name, values.length, context);

      results.push({
        type: "array",
        name,
        values,
        pointers,
        highlighted: [],
      });
    }

    return results;
  }

  /**
   * Collects all non-negative integer variables whose:
   * 1. Name is a known pointer pattern.
   * 2. Value is a valid index (< array.length).
   * 3. Name is not the array's own name.
   */
  private _buildPointers(
    arrayName: string,
    arrayLength: number,
    context: AnalysisContext,
  ): ArrayPointer[] {
    const pointers: ArrayPointer[] = [];

    for (const [varName, idx] of context.nonNegativeIntVars) {
      if (varName === arrayName) continue;
      if (idx < arrayLength && POINTER_NAMES.has(varName)) {
        pointers.push({ name: varName, index: idx });
      }
    }

    // Stable sort: by index first, then alphabetically so output is deterministic
    pointers.sort((a, b) => a.index - b.index || a.name.localeCompare(b.name));

    return pointers;
  }
}
