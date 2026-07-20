import React, { useMemo } from "react";
import { motion } from "framer-motion";
import type {
  BinaryTreeNodeViz,
  BinaryTreeVisualization,
} from "../../analysis/models/visualization";
import type { VisualizerProps } from "../VisualizationRegistry";
import { GLASS_CARD, GLASS_HEADER, displayValue } from "../shared/tokens";
import { FADE_IN } from "../ArrayVisualizer/animations";

type Props = VisualizerProps<BinaryTreeVisualization[]>;

// ─── Layout constants ─────────────────────────────────────────────────────────
const NODE_R    = 22;  // node circle radius (px)
const H_GAP     = 56;  // minimum horizontal gap between sibling subtrees
const V_GAP     = 64;  // vertical gap between levels
const PADDING   = 32;

// ─── Layout algorithm ─────────────────────────────────────────────────────────

interface LayoutNode {
  id: string;
  x: number;
  y: number;
  value: unknown;
  leftId:  string | null;
  rightId: string | null;
}

function layoutTree(
  nodeId: string | null,
  nodes: Record<string, BinaryTreeNodeViz>,
  depth: number,
  xMin: number,
  xMax: number,
  positions: Map<string, LayoutNode>,
): void {
  if (!nodeId || !nodes[nodeId]) return;
  const node = nodes[nodeId];
  const cx = (xMin + xMax) / 2;
  const cy = PADDING + depth * V_GAP;

  positions.set(nodeId, {
    id: nodeId,
    x: cx,
    y: cy,
    value: node.value,
    leftId: node.leftId,
    rightId: node.rightId,
  });

  const mid = (xMin + xMax) / 2;
  layoutTree(node.leftId,  nodes, depth + 1, xMin, mid - H_GAP / 4, positions);
  layoutTree(node.rightId, nodes, depth + 1, mid + H_GAP / 4, xMax, positions);
}

/**
 * BinaryTreeVisualizer
 *
 * Renders binary trees using SVG with automatically computed coordinates.
 * Each node is a circle labelled with its value.
 * Edges are straight lines between parent and child centres.
 */
const BinaryTreeVisualizer = React.memo(function BinaryTreeVisualizer({
  data,
}: Props) {
  if (!data.length) return null;
  return (
    <div className="flex flex-col gap-4">
      {data.map((tree) => (
        <SingleTree key={tree.name} tree={tree} />
      ))}
    </div>
  );
});

const SingleTree = React.memo(function SingleTree({
  tree,
}: {
  tree: BinaryTreeVisualization;
}) {
  const nodeCount = Object.keys(tree.nodes).length;

  const { positions, svgWidth, svgHeight } = useMemo(() => {
    if (!tree.rootId || nodeCount === 0) {
      return { positions: new Map<string, LayoutNode>(), svgWidth: 0, svgHeight: 0 };
    }

    const maxDepth = Math.max(
      ...Object.values(tree.nodes).map((n) => n.depth),
    );
    // Width must accommodate 2^maxDepth leaves
    const leafSlots = Math.pow(2, maxDepth);
    const svgWidth  = Math.max(300, leafSlots * (NODE_R * 2 + H_GAP)) + PADDING * 2;
    const svgHeight = (maxDepth + 1) * V_GAP + PADDING * 2;

    const positions = new Map<string, LayoutNode>();
    layoutTree(tree.rootId, tree.nodes, 0, PADDING, svgWidth - PADDING, positions);

    return { positions, svgWidth, svgHeight };
  }, [tree.rootId, tree.nodes, nodeCount]);

  return (
    <motion.div
      layout
      {...FADE_IN}
      className={`${GLASS_CARD} p-4`}
      role="region"
      aria-label={`Binary Tree: ${tree.name}`}
    >
      <div className={GLASS_HEADER}>
        Binary Tree&nbsp;
        <span className="text-slate-200 normal-case font-mono">{tree.name}</span>
        <span className="ml-2 text-slate-500">({nodeCount} nodes)</span>
      </div>

      {!tree.rootId || nodeCount === 0 ? (
        <p className="text-slate-600 text-xs italic">empty tree</p>
      ) : (
        <div className="overflow-auto">
          <svg
            width={svgWidth}
            height={svgHeight}
            className="block"
            aria-label={`Binary tree: ${tree.name}`}
          >
            {/* ── Edges ─────────────────────────────────────────────── */}
            {[...positions.values()].map((node) => {
              const edges = [];
              if (node.leftId) {
                const child = positions.get(node.leftId);
                if (child)
                  edges.push(
                    <line
                      key={`e-${node.id}-l`}
                      x1={node.x} y1={node.y}
                      x2={child.x} y2={child.y}
                      stroke="#475569" strokeWidth={1.5}
                    />,
                  );
              }
              if (node.rightId) {
                const child = positions.get(node.rightId);
                if (child)
                  edges.push(
                    <line
                      key={`e-${node.id}-r`}
                      x1={node.x} y1={node.y}
                      x2={child.x} y2={child.y}
                      stroke="#475569" strokeWidth={1.5}
                    />,
                  );
              }
              return edges;
            })}

            {/* ── Nodes ─────────────────────────────────────────────── */}
            {[...positions.values()].map((node) => {
              const isRoot = node.id === tree.rootId;
              const label  = displayValue(node.value, 5);
              return (
                <g key={node.id}>
                  <motion.circle
                    cx={node.x}
                    cy={node.y}
                    r={NODE_R}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                    fill={isRoot ? "#0d9488" : "#1e293b"}
                    stroke={isRoot ? "#2dd4bf" : "#475569"}
                    strokeWidth={isRoot ? 2 : 1.5}
                    style={{ transformOrigin: `${node.x}px ${node.y}px` }}
                    aria-label={`node value ${label}`}
                  />
                  <text
                    x={node.x}
                    y={node.y + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={isRoot ? "#ccfbf1" : "#cbd5e1"}
                    fontSize={label.length > 3 ? 9 : 11}
                    fontFamily="monospace"
                    fontWeight="600"
                  >
                    {label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </motion.div>
  );
});

export default BinaryTreeVisualizer;
