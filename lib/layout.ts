import dagre from "@dagrejs/dagre";
import type { DiagramSpec } from "./schema";
import type { AppNode, AppEdge } from "./flowTypes";

/**
 * Converts a validated DiagramSpec into React Flow nodes + edges, running
 * @dagrejs/dagre auto-layout for any node that doesn't carry explicit x/y.
 *
 * Container nodes (VPC / subnet boxes) are NOT laid out by dagre directly.
 * Instead we lay out the leaf nodes, then wrap each container tightly around
 * its children — this is robust and avoids dagre's compound-graph quirks.
 * React Flow child positions are relative to their immediate parent, so we
 * convert absolute layout coordinates into parent-relative ones at the end.
 */

const NODE_W = 172;
const NODE_H = 96;
const CONTAINER_PADDING = 36;
const CONTAINER_HEADER = 30;

interface AbsBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function specToFlow(spec: DiagramSpec): {
  nodes: AppNode[];
  edges: AppEdge[];
} {
  const nodeById = new Map(spec.nodes.map((n) => [n.id, n]));
  const containerIds = new Set(
    spec.nodes.filter((n) => n.isContainer).map((n) => n.id),
  );
  const leaves = spec.nodes.filter((n) => !n.isContainer);

  const everyLeafHasCoords =
    leaves.length > 0 &&
    leaves.every((n) => typeof n.x === "number" && typeof n.y === "number");

  // Absolute top-left box for every node, keyed by id.
  const absBoxes = new Map<string, AbsBox>();

  if (everyLeafHasCoords) {
    for (const n of leaves) {
      absBoxes.set(n.id, {
        x: n.x as number,
        y: n.y as number,
        width: NODE_W,
        height: NODE_H,
      });
    }
  } else {
    // Dagre lays out only the leaf nodes, honouring edges between them.
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 80, marginx: 20, marginy: 20 });
    g.setDefaultEdgeLabel(() => ({}));

    for (const n of leaves) {
      g.setNode(n.id, { width: NODE_W, height: NODE_H });
    }
    for (const e of spec.edges) {
      // Only route edges whose endpoints are both leaf nodes through dagre.
      if (!containerIds.has(e.source) && !containerIds.has(e.target)) {
        if (nodeById.has(e.source) && nodeById.has(e.target)) {
          g.setEdge(e.source, e.target);
        }
      }
    }

    dagre.layout(g);

    for (const n of leaves) {
      const pos = g.node(n.id);
      if (!pos) continue;
      absBoxes.set(n.id, {
        x: pos.x - NODE_W / 2,
        y: pos.y - NODE_H / 2,
        width: NODE_W,
        height: NODE_H,
      });
    }
  }

  // Size containers around their descendants, innermost first.
  // Order containers by depth (deepest first) so nested containers resolve
  // before their parents.
  const depthOf = (id: string): number => {
    let depth = 0;
    let current = nodeById.get(id);
    while (current?.parentId) {
      depth += 1;
      current = nodeById.get(current.parentId);
    }
    return depth;
  };

  const orderedContainers = [...containerIds].sort(
    (a, b) => depthOf(b) - depthOf(a),
  );

  for (const cId of orderedContainers) {
    const children = spec.nodes.filter((n) => n.parentId === cId);
    const childBoxes = children
      .map((c) => absBoxes.get(c.id))
      .filter((b): b is AbsBox => Boolean(b));

    if (childBoxes.length === 0) {
      // Empty container — give it a sensible default footprint.
      absBoxes.set(cId, { x: 0, y: 0, width: 220, height: 140 });
      continue;
    }

    const minX = Math.min(...childBoxes.map((b) => b.x));
    const minY = Math.min(...childBoxes.map((b) => b.y));
    const maxX = Math.max(...childBoxes.map((b) => b.x + b.width));
    const maxY = Math.max(...childBoxes.map((b) => b.y + b.height));

    absBoxes.set(cId, {
      x: minX - CONTAINER_PADDING,
      y: minY - CONTAINER_PADDING - CONTAINER_HEADER,
      width: maxX - minX + CONTAINER_PADDING * 2,
      height: maxY - minY + CONTAINER_PADDING * 2 + CONTAINER_HEADER,
    });
  }

  // Emit React Flow nodes. Parents must precede children in the array, and
  // child positions must be relative to their immediate parent.
  const orderedNodes = [...spec.nodes].sort(
    (a, b) => depthOf(a.id) - depthOf(b.id),
  );

  const nodes: AppNode[] = orderedNodes.map((n) => {
    const abs = absBoxes.get(n.id) ?? { x: 0, y: 0, width: NODE_W, height: NODE_H };
    const parentAbs = n.parentId ? absBoxes.get(n.parentId) : undefined;
    const position = parentAbs
      ? { x: abs.x - parentAbs.x, y: abs.y - parentAbs.y }
      : { x: abs.x, y: abs.y };

    if (n.isContainer) {
      const node: AppNode = {
        id: n.id,
        type: "container",
        position,
        data: { label: n.label, service: n.service },
        style: { width: abs.width, height: abs.height },
        ...(n.parentId ? { parentId: n.parentId, extent: "parent" as const } : {}),
      };
      return node;
    }

    const node: AppNode = {
      id: n.id,
      type: "service",
      position,
      data: { label: n.label, service: n.service },
      ...(n.parentId ? { parentId: n.parentId, extent: "parent" as const } : {}),
    };
    return node;
  });

  const edges: AppEdge[] = spec.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: "editable",
    animated: e.animated ?? false,
    data: { label: e.label },
    label: e.label,
  }));

  return { nodes, edges };
}

/**
 * Reverses specToFlow: turns the current React Flow state back into a
 * DiagramSpec (used for "edit existing diagram" prompts and JSON/Mermaid export).
 * Node positions are converted back to absolute coordinates.
 */
export function flowToSpec(
  title: string,
  nodes: AppNode[],
  edges: AppEdge[],
): DiagramSpec {
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const absPos = (id: string): { x: number; y: number } => {
    const node = byId.get(id);
    if (!node) return { x: 0, y: 0 };
    let x = node.position.x;
    let y = node.position.y;
    let parentId = node.parentId;
    while (parentId) {
      const parent = byId.get(parentId);
      if (!parent) break;
      x += parent.position.x;
      y += parent.position.y;
      parentId = parent.parentId;
    }
    return { x, y };
  };

  return {
    title,
    nodes: nodes
      // Free-floating text annotations aren't part of the architecture spec.
      .filter(
        (n): n is Exclude<AppNode, { type: "text" }> => n.type !== "text",
      )
      .map((n) => {
      const { x, y } = absPos(n.id);
      return {
        id: n.id,
        service: n.data.service,
        label: n.data.label,
        ...(n.parentId ? { parentId: n.parentId } : {}),
        ...(n.type === "container" ? { isContainer: true } : {}),
        x: Math.round(x),
        y: Math.round(y),
      };
    }),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      ...(e.data?.label ? { label: e.data.label } : {}),
      ...(e.animated ? { animated: true } : {}),
    })),
  };
}
