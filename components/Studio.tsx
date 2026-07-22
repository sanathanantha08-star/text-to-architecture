"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { useDiagramStore } from "@/lib/store";
import Canvas from "./Canvas";
import PromptBar from "./PromptBar";
import RightPanel from "./RightPanel";

export default function Studio() {
  const title = useDiagramStore((s) => s.title);
  const hasGraph = useDiagramStore((s) => s.nodes.length > 0);

  return (
    <ReactFlowProvider>
      <div className="flex h-screen w-screen flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="rounded bg-sky-600 px-1.5 py-0.5 text-xs font-bold text-white">
              ArchGen
            </span>
            <span className="text-sm text-slate-400">
              AI AWS Architecture Studio
            </span>
          </div>
          {hasGraph && (
            <span className="truncate text-xs font-medium text-slate-300">
              {title}
            </span>
          )}
        </header>

        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            <PromptBar />
            <div className="min-h-0 flex-1">
              <Canvas />
            </div>
          </div>
          <RightPanel />
        </div>
      </div>
    </ReactFlowProvider>
  );
}
