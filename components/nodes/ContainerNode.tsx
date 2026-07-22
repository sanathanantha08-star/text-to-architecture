"use client";

import { useEffect, useRef, useState } from "react";
import {
  Handle,
  Position,
  NodeResizer,
  type NodeProps,
} from "@xyflow/react";
import type { ContainerFlowNode } from "@/lib/flowTypes";
import { getServiceMeta, getCategoryColor } from "@/lib/awsIconMap";
import { useDiagramStore } from "@/lib/store";

export default function ContainerNode({
  id,
  data,
  selected,
}: NodeProps<ContainerFlowNode>) {
  const meta = getServiceMeta(data.service);
  const color = getCategoryColor(data.service);
  const updateNodeLabel = useDiagramStore((s) => s.updateNodeLabel);
  const takeSnapshot = useDiagramStore((s) => s.takeSnapshot);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setDraft(data.label), [data.label]);
  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next && next !== data.label) updateNodeLabel(id, next);
    else setDraft(data.label);
  };

  return (
    <div
      className="h-full w-full rounded-lg"
      style={{
        border: `2px dashed ${color}`,
        background: `${color}12`,
      }}
    >
      <NodeResizer
        isVisible={selected}
        color={color}
        minWidth={200}
        minHeight={140}
        onResizeStart={takeSnapshot}
      />

      <Handle id="c-in" type="target" position={Position.Top} />
      <Handle id="c-out" type="source" position={Position.Bottom} />

      <div className="flex items-center gap-2 px-3 py-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={meta.icon}
          alt={meta.name}
          width={18}
          height={18}
          draggable={false}
          className="pointer-events-none select-none"
        />
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft(data.label);
                setEditing(false);
              }
            }}
            className="rounded bg-slate-800 px-1 text-xs text-slate-100 outline-none ring-1 ring-slate-600"
          />
        ) : (
          <span
            className="cursor-text text-xs font-semibold uppercase tracking-wide"
            style={{ color }}
            onDoubleClick={() => setEditing(true)}
            title="Double-click to rename"
          >
            {data.label}
          </span>
        )}
      </div>
    </div>
  );
}
