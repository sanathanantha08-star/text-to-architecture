"use client";

import { useEffect, useRef, useState } from "react";
import {
  Handle,
  Position,
  NodeResizer,
  type NodeProps,
} from "@xyflow/react";
import type { ServiceFlowNode } from "@/lib/flowTypes";
import { getServiceMeta, getCategoryColor } from "@/lib/awsIconMap";
import { useDiagramStore } from "@/lib/store";

export default function ServiceNode({
  id,
  data,
  selected,
}: NodeProps<ServiceFlowNode>) {
  const meta = getServiceMeta(data.service);
  const color = getCategoryColor(data.service);
  const updateNodeLabel = useDiagramStore((s) => s.updateNodeLabel);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(data.label);
  }, [data.label]);

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
      className="group relative flex h-full w-full min-w-[150px] flex-col items-center gap-2 rounded-lg bg-slate-900/95 px-3 py-3 shadow-lg"
      style={{ border: `2px solid ${color}` }}
    >
      <NodeResizer
        isVisible={selected}
        color={color}
        minWidth={140}
        minHeight={84}
      />

      <Handle id="in-top" type="target" position={Position.Top} />
      <Handle id="in-left" type="target" position={Position.Left} />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={meta.icon}
        alt={meta.name}
        width={40}
        height={40}
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
          className="w-full rounded bg-slate-800 px-1 text-center text-xs text-slate-100 outline-none ring-1 ring-slate-600"
        />
      ) : (
        <div
          className="max-w-[150px] cursor-text text-center text-xs font-medium leading-tight text-slate-100"
          onDoubleClick={() => setEditing(true)}
          title="Double-click to rename"
        >
          {data.label}
        </div>
      )}

      <span
        className="absolute -top-2 left-2 rounded px-1 text-[9px] font-semibold uppercase tracking-wide text-white"
        style={{ background: color }}
      >
        {meta.name}
      </span>

      <Handle id="out-bottom" type="source" position={Position.Bottom} />
      <Handle id="out-right" type="source" position={Position.Right} />
    </div>
  );
}
