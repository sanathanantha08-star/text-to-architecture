"use client";

import { useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { useDiagramStore } from "@/lib/store";
import IconPicker from "./IconPicker";

export default function Toolbar() {
  const addServiceNode = useDiagramStore((s) => s.addServiceNode);
  const addTextNode = useDiagramStore((s) => s.addTextNode);
  const { fitView } = useReactFlow();
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="absolute left-3 top-3 z-10 flex flex-col gap-2">
      <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/95 p-1 shadow-lg">
        <button
          onClick={() => setShowPicker((v) => !v)}
          className="rounded px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
          title="Add a node"
        >
          + Node
        </button>
        <button
          onClick={addTextNode}
          className="rounded px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
          title="Add a free-floating text box"
        >
          + Text
        </button>
        <div className="h-5 w-px bg-slate-700" />
        <button
          onClick={() => fitView({ padding: 0.2, duration: 300 })}
          className="rounded px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
          title="Fit view"
        >
          Fit
        </button>
      </div>

      {showPicker && (
        <IconPicker
          title="Add a node"
          onPick={(key) => {
            addServiceNode(key);
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
