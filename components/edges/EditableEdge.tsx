"use client";

import { useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import type { AppEdge } from "@/lib/flowTypes";
import { useDiagramStore } from "@/lib/store";

export default function EditableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps<AppEdge>) {
  const updateEdgeLabel = useDiagramStore((s) => s.updateEdgeLabel);
  const deleteEdge = useDiagramStore((s) => s.deleteEdge);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data?.label ?? "");

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const label = data?.label ?? "";

  const startEditing = () => {
    setDraft(label);
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    updateEdgeLabel(id, draft.trim());
  };

  // Nothing to show on a bare, unselected edge — keeps the canvas clean.
  const showLabelLayer = editing || Boolean(label) || selected;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{ stroke: selected ? "#38bdf8" : "#64748b" }}
      />
      {showLabelLayer && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan absolute flex items-center gap-1"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
            }}
          >
            {editing ? (
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commit();
                  if (e.key === "Escape") setEditing(false);
                }}
                placeholder="label"
                className="w-28 rounded bg-slate-800 px-1.5 py-0.5 text-center text-[11px] text-slate-100 outline-none ring-1 ring-sky-500"
              />
            ) : label ? (
              // Readable text — single click to edit.
              <span
                onClick={startEditing}
                className="cursor-text rounded bg-slate-950/70 px-1.5 py-0.5 text-[11px] font-medium text-slate-100"
                title="Click to edit label"
              >
                {label}
              </span>
            ) : (
              // No label yet, but the edge is selected: offer to add one.
              <button
                onClick={startEditing}
                className="rounded bg-slate-800/90 px-1.5 py-0.5 text-[11px] text-slate-300 ring-1 ring-slate-600 hover:ring-sky-500"
                title="Add a label"
              >
                + label
              </button>
            )}
            {selected && (
              <button
                onClick={() => deleteEdge(id)}
                className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] leading-none text-white"
                title="Delete edge"
              >
                ×
              </button>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
