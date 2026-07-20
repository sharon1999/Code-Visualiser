/**
 * Visualizer Registrations
 *
 * This is the ONLY file that imports both the registry and all visualizer
 * components.  Side-effect: self-registers every visualizer on import.
 *
 * To add a new visualizer (e.g. TrieVisualizer):
 *   1. Create src/visualizers/TrieVisualizer/TrieVisualizer.tsx
 *   2. Add one call to VisualizationRegistry.register() here.
 *   3. Done — VisualizationRenderer picks it up automatically.
 */

import { VisualizationRegistry } from "./VisualizationRegistry";
import ArrayVisualizer from "./ArrayVisualizer/ArrayVisualizer";
import HashMapVisualizer from "./HashMapVisualizer/HashMapVisualizer";
import StackVisualizer from "./StackVisualizer/StackVisualizer";
import QueueVisualizer from "./QueueVisualizer/QueueVisualizer";
import LinkedListVisualizer from "./LinkedListVisualizer/LinkedListVisualizer";
import BinaryTreeVisualizer from "./BinaryTreeVisualizer/BinaryTreeVisualizer";
import GraphVisualizer from "./GraphVisualizer/GraphVisualizer";
import VariableInspector from "./VariableInspector/VariableInspector";

VisualizationRegistry.register({
  stateKey: "variables",
  label: "Variables",
  component: VariableInspector,
  priority: 10,
});

VisualizationRegistry.register({
  stateKey: "arrays",
  label: "Arrays",
  component: ArrayVisualizer,
  priority: 20,
});

VisualizationRegistry.register({
  stateKey: "stacks",
  label: "Stacks",
  component: StackVisualizer,
  priority: 30,
});

VisualizationRegistry.register({
  stateKey: "queues",
  label: "Queues",
  component: QueueVisualizer,
  priority: 40,
});

VisualizationRegistry.register({
  stateKey: "hashMaps",
  label: "Hash Maps",
  component: HashMapVisualizer,
  priority: 50,
});

VisualizationRegistry.register({
  stateKey: "linkedLists",
  label: "Linked Lists",
  component: LinkedListVisualizer,
  priority: 60,
});

VisualizationRegistry.register({
  stateKey: "binaryTrees",
  label: "Binary Trees",
  component: BinaryTreeVisualizer,
  priority: 70,
});

VisualizationRegistry.register({
  stateKey: "graphs",
  label: "Graphs",
  component: GraphVisualizer,
  priority: 80,
});
