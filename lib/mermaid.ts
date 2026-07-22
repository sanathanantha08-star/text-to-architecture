import type { DiagramSpec } from "./schema";

/** Sanitises a label for safe inclusion inside a Mermaid node/edge. */
function esc(label: string): string {
  return label.replace(/"/g, "'").replace(/\n/g, " ");
}

/** Mermaid ids can't contain most punctuation — normalise node ids. */
function safeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, "_");
}

/**
 * Converts a DiagramSpec into a Mermaid `flowchart TD`, using `subgraph`
 * blocks for container nodes so VPC/subnet grouping survives the export.
 */
export function specToMermaid(spec: DiagramSpec): string {
  const lines: string[] = ["flowchart TD"];
  const containers = spec.nodes.filter((n) => n.isContainer);
  const leaves = spec.nodes.filter((n) => !n.isContainer);

  const renderLeaf = (id: string, label: string, indent: string) => {
    lines.push(`${indent}${safeId(id)}["${esc(label)}"]`);
  };

  // Top-level leaves (no parent).
  for (const n of leaves) {
    if (!n.parentId) renderLeaf(n.id, n.label, "  ");
  }

  // Each container becomes a subgraph holding its direct leaf children.
  for (const c of containers) {
    lines.push(`  subgraph ${safeId(c.id)}["${esc(c.label)}"]`);
    for (const n of leaves) {
      if (n.parentId === c.id) renderLeaf(n.id, n.label, "    ");
    }
    lines.push("  end");
  }

  for (const e of spec.edges) {
    const arrow = e.label ? `-->|${esc(e.label)}|` : "-->";
    lines.push(`  ${safeId(e.source)} ${arrow} ${safeId(e.target)}`);
  }

  return lines.join("\n");
}
