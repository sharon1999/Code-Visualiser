/**
 * Visualization Registry
 *
 * Implements the Open/Closed Principle for the visualization engine.
 * New visualizers (Trie, Heap, Segment Tree…) are registered here;
 * VisualizationRenderer never needs to change.
 *
 * Each entry maps a key from VisualizationState to:
 *   - the visualizer component (lazy-loadable React component)
 *   - a human-readable label
 *   - a priority (lower = rendered first)
 */

import type { ComponentType } from "react";
import type { VisualizationState } from "../analysis/models/visualization";

// ─── Base props every visualizer must accept ──────────────────────────────────

export interface VisualizerProps<T> {
  /** The data model produced by the Algorithm State Analyzer. */
  data: T;
  /** Optional CSS class injected by the renderer. */
  className?: string;
}

// ─── Registry entry ────────────────────────────────────────────────────────────

export interface VisualizerRegistryEntry<
  K extends keyof VisualizationState = keyof VisualizationState,
> {
  /** Key in VisualizationState this entry handles. */
  stateKey: K;
  /** Human-readable label shown as the section header. */
  label: string;
  /**
   * The React component to render.
   * Receives `data` = `VisualizationState[K]`.
   * Must be wrapped in React.memo for perf.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: ComponentType<VisualizerProps<any>>;
  /**
   * Lower priority values are rendered first.
   * Default = 50.
   */
  priority: number;
  /**
   * If provided, the entry is only shown when this predicate returns true.
   * Useful for hiding a section when the state array is empty.
   */
  isVisible?: (state: VisualizationState) => boolean;
}

// ─── Registry singleton ────────────────────────────────────────────────────────

class VisualizationRegistryClass {
  private _entries: VisualizerRegistryEntry[] = [];

  /**
   * Registers a new visualizer.
   * Call this at module-load time (top of each visualizer's index file).
   */
  register<K extends keyof VisualizationState>(
    entry: VisualizerRegistryEntry<K>,
  ): void {
    // Replace if already registered under same stateKey
    this._entries = this._entries.filter((e) => e.stateKey !== entry.stateKey);
    this._entries.push(entry as VisualizerRegistryEntry);
    // Keep sorted by priority
    this._entries.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Returns all registered entries sorted by priority.
   * Used by VisualizationRenderer to decide what to render.
   */
  getAll(): ReadonlyArray<VisualizerRegistryEntry> {
    return this._entries;
  }

  /**
   * Returns entries whose `isVisible` gate passes for the given state.
   * Entries without an `isVisible` predicate are always included.
   */
  getVisible(state: VisualizationState): ReadonlyArray<VisualizerRegistryEntry> {
    return this._entries.filter((entry) => {
      if (entry.isVisible) return entry.isVisible(state);
      // Default: visible when the array for this stateKey is non-empty
      const value = state[entry.stateKey];
      if (Array.isArray(value)) return value.length > 0;
      return true;
    });
  }
}

export const VisualizationRegistry = new VisualizationRegistryClass();
