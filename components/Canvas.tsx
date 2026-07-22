"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  ConnectionMode,
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
import TextNode from "./nodes/TextNode";
import EditableEdge from "./edges/EditableEdge";
import Toolbar from "./Toolbar";

const nodeTypes: NodeTypes = {
  service: ServiceNode,
  container: ContainerNode,
  text: TextNode,
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
  const takeSnapshot = useDiagramStore((s) => s.takeSnapshot);
  const undo = useDiagramStore((s) => s.undo);
  const redo = useDiagramStore((s) => s.redo);
  const deleteNode = useDiagramStore((s) => s.deleteNode);
  const deleteSelected = useDiagramStore((s) => s.deleteSelected);
  const generating = useDiagramStore((s) => s.generating);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<
    { id: string; top: number; left: number } | null
  >(null);
  const closeMenu = useCallback(() => setMenu(null), []);

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: AppNode) => {
      event.preventDefault();
      const rect = wrapperRef.current?.getBoundingClientRect();
      setMenu({
        id: node.id,
        top: event.clientY - (rect?.top ?? 0),
        left: event.clientX - (rect?.left ?? 0),
      });
    },
    [],
  );

  const defaultEdgeOptions = useMemo(
    () => ({ type: "editable" as const }),
    [],
  );

  // Keyboard: Cmd/Ctrl+Z undo, Cmd/Ctrl+Shift+Z (or Ctrl+Y) redo,
  // Delete/Backspace removes the current selection (undoable).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't hijack native text editing while typing in a field.
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const mod = e.metaKey || e.ctrlKey;

      if (mod) {
        const key = e.key.toLowerCase();
        if (key === "z") {
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
        } else if (key === "y") {
          e.preventDefault();
          redo();
        }
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo, deleteSelected]);

  const isEmpty = nodes.length === 0;

  return (
    <div ref={wrapperRef} className="relative h-full w-full">
      <ReactFlow<AppNode>
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        onNodeDragStart={() => {
          closeMenu();
          takeSnapshot();
        }}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={closeMenu}
        onPaneContextMenu={closeMenu}
        onMoveStart={closeMenu}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionMode={ConnectionMode.Loose}
        connectionRadius={45}
        snapToGrid
        snapGrid={[16, 16]}
        minZoom={0.1}
        maxZoom={2}
        fitView
        deleteKeyCode={null}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Lines} gap={20} size={1} color="#1e293b" />
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

      {menu && (
        <div
          className="absolute z-20 min-w-[130px] overflow-hidden rounded-md border border-slate-700 bg-slate-900 py-1 shadow-xl"
          style={{ top: menu.top, left: menu.left }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <button
            onClick={() => {
              deleteNode(menu.id);
              closeMenu();
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-rose-300 hover:bg-slate-800"
          >
            Delete
          </button>
        </div>
      )}

      {isEmpty && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="max-w-md rounded-xl border border-slate-800 bg-slate-900/70 px-6 py-5 text-center">
            {generating ? (
              <div className="flex flex-col items-center gap-3">
                <span
                  className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-sky-400"
                  aria-hidden
                />
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">
                    Generating your architecture
                    <span className="archgen-dots" />
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Designing nodes and connections — this usually takes a few seconds.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-sm font-semibold text-slate-200">
                  Describe an architecture to begin
                </h3>
                <p className="mt-1 text-xs text-slate-400">
                  Type a system description above and hit{" "}
                  <span className="font-semibold text-sky-400">Generate</span> (or ⌘/Ctrl+Enter),
                  or click one of the example prompts. Then drag, rename, connect, and export.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
