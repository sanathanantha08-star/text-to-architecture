import { create } from "zustand";
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  reconnectEdge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from "@xyflow/react";
import type { AppNode, AppEdge } from "./flowTypes";
import type { DiagramSpec } from "./schema";
import { specToFlow, flowToSpec } from "./layout";
import { getServiceMeta } from "./awsIconMap";

let idCounter = 0;
function uid(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

export interface HistoryEntry {
  id: string;
  prompt: string;
  mock: boolean;
  at: number;
}

interface DiagramState {
  title: string;
  nodes: AppNode[];
  edges: AppEdge[];
  history: HistoryEntry[];

  // graph lifecycle
  setSpec: (spec: DiagramSpec) => void;
  getSpec: () => DiagramSpec;
  reset: () => void;
  setTitle: (title: string) => void;

  // react flow handlers
  onNodesChange: (changes: NodeChange<AppNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<AppEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  onReconnect: (oldEdge: AppEdge, newConnection: Connection) => void;

  // manual editing
  addServiceNode: (service: string) => void;
  updateNodeLabel: (id: string, label: string) => void;
  updateNodeService: (id: string, service: string) => void;
  updateEdgeLabel: (id: string, label: string) => void;
  deleteEdge: (id: string) => void;
  deleteSelected: () => void;

  // prompt history
  pushHistory: (prompt: string, mock: boolean) => void;
}

export const useDiagramStore = create<DiagramState>((set, get) => ({
  title: "Untitled Architecture",
  nodes: [],
  edges: [],
  history: [],

  setSpec: (spec) => {
    const { nodes, edges } = specToFlow(spec);
    set({ title: spec.title, nodes, edges });
  },

  getSpec: () => flowToSpec(get().title, get().nodes, get().edges),

  reset: () =>
    set({
      title: "Untitled Architecture",
      nodes: [],
      edges: [],
      history: [],
    }),

  setTitle: (title) => set({ title }),

  onNodesChange: (changes) =>
    set({ nodes: applyNodeChanges(changes, get().nodes) }),

  onEdgesChange: (changes) =>
    set({ edges: applyEdgeChanges(changes, get().edges) }),

  onConnect: (connection) =>
    set({
      edges: addEdge(
        {
          ...connection,
          id: uid("e"),
          type: "editable",
          data: { label: "" },
        },
        get().edges,
      ),
    }),

  onReconnect: (oldEdge, newConnection) =>
    set({ edges: reconnectEdge(oldEdge, newConnection, get().edges) }),

  addServiceNode: (service) => {
    const meta = getServiceMeta(service);
    const isContainer = service === "vpc" || service === "subnet";
    const node: AppNode = isContainer
      ? {
          id: uid("n"),
          type: "container",
          position: { x: 80, y: 80 },
          data: { label: meta.name, service },
          style: { width: 260, height: 180 },
        }
      : {
          id: uid("n"),
          type: "service",
          position: { x: 120, y: 120 },
          data: { label: meta.name, service },
        };
    set({ nodes: [...get().nodes, node] });
  },

  updateNodeLabel: (id, label) =>
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, label } } : n,
      ),
    }),

  updateNodeService: (id, service) =>
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, service } } : n,
      ),
    }),

  updateEdgeLabel: (id, label) =>
    set({
      edges: get().edges.map((e) =>
        e.id === id ? { ...e, data: { ...e.data, label }, label } : e,
      ),
    }),

  deleteEdge: (id) =>
    set({ edges: get().edges.filter((e) => e.id !== id) }),

  deleteSelected: () => {
    const selectedNodeIds = new Set(
      get().nodes.filter((n) => n.selected).map((n) => n.id),
    );
    set({
      nodes: get().nodes.filter((n) => !n.selected),
      edges: get().edges.filter(
        (e) =>
          !e.selected &&
          !selectedNodeIds.has(e.source) &&
          !selectedNodeIds.has(e.target),
      ),
    });
  },

  pushHistory: (prompt, mock) =>
    set({
      history: [
        ...get().history,
        { id: uid("h"), prompt, mock, at: Date.now() },
      ],
    }),
}));
