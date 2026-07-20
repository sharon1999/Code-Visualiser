/**
 * StackDetector
 *
 * Detects arrays used as stacks via variable-name heuristics.
 *
 * A variable is treated as a stack when:
 *   1. Its heap entry is `kind: "array"`.
 *   2. Its name is in the `STACK_NAMES` set.
 *
 * Items are exposed bottom-to-top (index 0 = bottom, last index = top)
 * which is the natural JavaScript array convention for push/pop stacks.
 */

import type {
  AnalysisContext,
  Detector,
  StackVisualization,
} from "../models/visualization";
import { STACK_NAMES } from "../utils/naming";

export class StackDetector implements Detector<StackVisualization> {
  readonly id = "StackDetector";

  supports(context: AnalysisContext): boolean {
    for (const name of context.arrayVars.keys()) {
      if (STACK_NAMES.has(name)) return true;
    }
    return false;
  }

  analyze(context: AnalysisContext): StackVisualization[] {
    const results: StackVisualization[] = [];

    for (const [name, { entry }] of context.arrayVars) {
      if (!STACK_NAMES.has(name)) continue;

      results.push({
        type: "stack",
        name,
        items: entry.value as unknown[],
      });
    }

    return results;
  }
}
