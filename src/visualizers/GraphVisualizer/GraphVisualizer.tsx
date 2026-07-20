import React, { useMemo } from "react";
import { motion } from "framer-motion";
import type { GraphVisualization } from "../../analysis/models/visualization";
import type { VisualizerProps } from "../VisualizationRegistry";
import { GLASS_CARD, GLASS_HEADER } from "../shared/tokens";
import { FADE_IN } from "../ArrayVisualizer/animations";

type Props = VisualizerProps<GraphVisualization[]>;

// ─── Layout ───────────────────────────────────────────────────────────────────
const NODE_R  = 22;
const PADDING = 60;

/** Distributes nodes in a circle for a force-free but readable layout. */
function circularLayout(
  nodeIds: string[],
  svgSize: number,
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const r  = svgSize / 2 - PADDING;
  const n  = nodeIds.length;

  nodeIds.forEach((id, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    positions.set(id, {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    });
  });
  return positions;
}

/**
 * GraphVisualizer
 *
 * Renders undirected and directed graphs using SVG circular layout.
 * Directed edges include an arrowhead marker.
 * Node labels are the node id strings.
 */
const GraphVisualizer = React.memo(function GraphVisualizer({ data }: Props) {
  if (!data.length) return null;
  return (
    <div className="flex flex-col gap-4">
      {data.map((graph) => (
        <SingleGraph key={graph.name} graph={graph} />
      ))}
    </div>
  );
});

const SingleGraph = React.memo(function SingleGraph({
  graph,
}: {
  graph: GraphVisualization;
}) {
  const svgSize = useMemo(() => {
    const n = graph.nodes.length;
    return Math.max(280, Math.min(560, n * 60 + PADDING * 2));
  }, [graph.nodes.length]);

  const positions = useMemo(
    () => circularLayout(graph.nodes.map((n) => n.id), svgSize),
    [graph.nodes, svgSize],
  );

  const markerId = `arrow-${graph.name}`;

  return (
    <motion.div
      layout
      {...FADE_IN}
      className={`${GLASS_CARD} p-4`}
      role="region"
      aria-label={`Graph: ${graph.name}`}
    >
      <div className={GLASS_HEADER}>
        Graph&nbsp;
        <span className="text-slate-200 normal-case font-mono">{graph.name}</span>
        <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-slate-800 border border-slate-700 text-slate-400">
          {graph.directed ? "directed" : "undirected"}
        </span>
        <span className="ml-1 text-slate-500">
          {graph.nodes.length}V · {graph.edges.length}E
        </span>
      </div>

      <div className="flex justify-center overflow-auto">
        <svg
          width={svgSize}
          height={svgSize}
          className="block"
          aria-label={`${graph.directed ? "Directed" : "Undirected"} graph: ${graph.name}`}
        >
          <defs>
            {graph.directed && (
              <marker
                id={markerId}
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L0,6 L8,3 z" fill="#64748b" />
              </marker>
            )}
          </defs>

          {/* Edges */}
          {graph.edges.map((edge) => {
            const src = positions.get(edge.source);
            const tgt = positions.get(edge.target);
            if (!src || !tgt) return null;

            // Shorten line so it doesn't overlap node circles
            const dx = tgt.x - src.x;
            const dy = tgt.y - src.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist === 0) return null;
            const ux = dx / dist;
            const uy = dy / dist;
            const gap = graph.directed ? NODE_R + 6 : NODE_R;
            const x1 = src.x + ux * NODE_R;
            const y1 = src.y + uy * NODE_R;
            const x2 = tgt.x - ux * gap;
            const y2 = tgt.y - uy * gap;

            const key = `${edge.source}-${edge.target}`;
            return (
              <g key={key}>
                <line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="#64748b"
                  strokeWidth={1.5}
                  markerEnd={graph.directed ? `url(#${markerId})` : undefined}
                />
                {/* Weight label */}
                {edge.weight !== undefined && (
                  <text
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2 - 6}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize={9}
                    fontFamily="monospace"
                  >
                    {edge.weight}
                  </text>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {graph.nodes.map((node) => {
            const pos = positions.get(node.id);
            if (!pos) return null;
            return (
              <g key={node.id}>
                <motion.circle
                  cx={pos.x}
                  cy={pos.y}
                  r={NODE_R}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  fill="#1e293b"
                  stroke="#475569"
                  strokeWidth={1.5}
                  style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
                  aria-label={`node ${node.label}`}
                />
                <text
                  x={pos.x}
                  y={pos.y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#cbd5e1"
                  fontSize={11}
                  fontFamily="monospace"
                  fontWeight="600"
                  pointerEvents="none"
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </motion.div>
  );
});

export default GraphVisualizer;
