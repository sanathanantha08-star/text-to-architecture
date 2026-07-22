"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useDiagramStore } from "@/lib/store";
import { getCategoryColor } from "@/lib/awsIconMap";
import type { AppNode } from "@/lib/flowTypes";
import ServiceNode from "./nodes/ServiceNode";
import ContainerNode from "./nodes/ContainerNode";
import EditableEdge from "./edges/EditableEdge";
import Toolbar from "./Toolbar";

const nodeTypes: NodeTypes = {
  service: ServiceNode,
  container: ContainerNode,
};

const edgeTypes: EdgeTypes = {
  editable: EditableEdge,
};

export default function Canvas() {
  const nodes = useDiagramStore((s) => s.nodes);
  const edges = useDiagramStore((s) => s.edges);
  const onNodesChange = useDiagramStore((s) => s.onNodesChange);
  const onEdgesChange = useDiagramStore((s) => s.onEdgesChange);
  const onConnect = useDiagramStore((s) => s.onConnect);
  const onReconnect = useDiagramStore((s) => s.onReconnect);

  const defaultEdgeOptions = useMemo(
    () => ({ type: "editable" as const }),
    [],
  );

  const isEmpty = nodes.length === 0;

  return (
    <div className="relative h-full w-full">
      <ReactFlow<AppNode>
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        snapToGrid
        snapGrid={[16, 16]}
        minZoom={0.1}
        maxZoom={2}
        fitView
        deleteKeyCode={["Backspace", "Delete"]}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1e293b" />
        <Controls className="!bg-slate-900 !text-slate-200" />
        <MiniMap
          pannable
          zoomable
          className="!bg-slate-900"
          nodeColor={(n) => getCategoryColor((n.data as { service?: string })?.service ?? "generic")}
          maskColor="rgba(2,6,23,0.6)"
        />
        <Toolbar />
      </ReactFlow>

      {isEmpty && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="max-w-md rounded-xl border border-slate-800 bg-slate-900/70 px-6 py-5 text-center">
            <h3 className="text-sm font-semibold text-slate-200">
              Describe an architecture to begin
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Type a system description above and hit{" "}
              <span className="font-semibold text-sky-400">Generate</span> (or ⌘/Ctrl+Enter),
              or click one of the example prompts. Then drag, rename, connect, and export.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
