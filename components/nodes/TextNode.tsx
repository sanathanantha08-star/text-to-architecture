"use client";

import { useEffect, useRef, useState } from "react";
import { NodeResizer, type NodeProps } from "@xyflow/react";
import type { TextFlowNode } from "@/lib/flowTypes";
import { useDiagramStore } from "@/lib/store";

export default function TextNode({
  id,
  data,
  selected,
}: NodeProps<TextFlowNode>) {
  const updateNodeText = useDiagramStore((s) => s.updateNodeText);
  const takeSnapshot = useDiagramStore((s) => s.takeSnapshot);

  // Stay draggable by default (like the service nodes); double-click to edit.
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.text);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setDraft(data.text), [data.text]);
  useEffect(() => {
    if (editing) areaRef.current?.focus();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const next = draft;
    if (next !== data.text) updateNodeText(id, next);
  };

  return (
    <div
      className="h-full w-full rounded-md"
      style={{
        border: selected ? "1px dashed #38bdf8" : "1px dashed transparent",
        background: selected ? "rgba(56,189,248,0.06)" : "transparent",
      }}
    >
      <NodeResizer
        isVisible={selected}
        color="#38bdf8"
        minWidth={80}
        minHeight={36}
        onResizeStart={takeSnapshot}
      />

      {editing ? (
        <textarea
          ref={areaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setDraft(data.text);
              setEditing(false);
            }
            // Cmd/Ctrl+Enter commits; plain Enter inserts a newline.
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit();
          }}
          placeholder="Type text…"
          className="nodrag h-full min-h-[36px] w-full min-w-[80px] resize-none rounded-md bg-transparent px-2 py-1 text-sm text-slate-100 outline-none ring-1 ring-sky-500"
        />
      ) : (
        <div
          className="h-full w-full cursor-move select-none whitespace-pre-wrap break-words px-2 py-1 text-sm text-slate-100"
          onDoubleClick={() => setEditing(true)}
          title="Drag to move · double-click to edit"
        >
          {data.text || (
            <span className="text-slate-500">Double-click to edit</span>
          )}
        </div>
      )}
    </div>
  );
}
