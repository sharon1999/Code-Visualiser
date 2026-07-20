/**
 * QueueDetector
 *
 * Detects arrays used as queues / deques via variable-name heuristics.
 *
 * A variable is treated as a queue when:
 *   1. Its heap entry is `kind: "array"`.
 *   2. Its name is in the `QUEUE_NAMES` set.
 *
 * Items are exposed front-to-back (index 0 = front, last = back)
 * which is the natural JavaScript array convention for shift/push queues.
 */

import type {
  AnalysisContext,
  Detector,
  QueueVisualization,
} from "../models/visualization";
import { QUEUE_NAMES } from "../utils/naming";

export class QueueDetector implements Detector<QueueVisualization> {
  readonly id = "QueueDetector";

  supports(context: AnalysisContext): boolean {
    for (const name of context.arrayVars.keys()) {
      if (QUEUE_NAMES.has(name)) return true;
    }
    return false;
  }

  analyze(context: AnalysisContext): QueueVisualization[] {
    const results: QueueVisualization[] = [];

    for (const [name, { entry }] of context.arrayVars) {
      if (!QUEUE_NAMES.has(name)) continue;

      results.push({
        type: "queue",
        name,
        items: entry.value as unknown[],
      });
    }

    return results;
  }
}
