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

  const commit = () => {
    setEditing(false);
    updateEdgeLabel(id, draft.trim());
  };

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{ stroke: selected ? "#38bdf8" : "#64748b" }}
      />
      <EdgeLabelRenderer>
        <div
          className="group nodrag nopan absolute flex items-center gap-1"
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
              className="w-24 rounded bg-slate-800 px-1 text-center text-[10px] text-slate-100 outline-none ring-1 ring-sky-500"
            />
          ) : (
            <button
              onDoubleClick={() => {
                setDraft(label);
                setEditing(true);
              }}
              className="rounded bg-slate-800/90 px-1.5 py-0.5 text-[10px] text-slate-200 ring-1 ring-slate-700 hover:ring-sky-500"
              title="Double-click to edit label"
            >
              {label || "+ label"}
            </button>
          )}
          <button
            onClick={() => deleteEdge(id)}
            className="hidden h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] leading-none text-white group-hover:flex"
            title="Delete edge"
          >
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
