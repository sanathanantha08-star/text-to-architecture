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

/** A restorable point-in-time snapshot of the diagram for undo/redo. */
interface Snapshot {
  title: string;
  nodes: AppNode[];
  edges: AppEdge[];
}

const MAX_UNDO = 50;

interface DiagramState {
  title: string;
  nodes: AppNode[];
  edges: AppEdge[];
  history: HistoryEntry[];

  /** True while a generate/edit request is in flight. */
  generating: boolean;
  setGenerating: (v: boolean) => void;

  // undo / redo
  past: Snapshot[];
  future: Snapshot[];
  takeSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

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
  addTextNode: () => void;
  updateNodeLabel: (id: string, label: string) => void;
  updateNodeService: (id: string, service: string) => void;
  updateNodeText: (id: string, text: string) => void;
  updateEdgeLabel: (id: string, label: string) => void;
  deleteEdge: (id: string) => void;
  deleteNode: (id: string) => void;
  deleteSelected: () => void;

  // prompt history
  pushHistory: (prompt: string, mock: boolean) => void;
}

export const useDiagramStore = create<DiagramState>((set, get) => ({
  title: "Untitled Architecture",
  nodes: [],
  edges: [],
  history: [],

  generating: false,
  setGenerating: (v) => set({ generating: v }),

  past: [],
  future: [],

  takeSnapshot: () =>
    set((s) => ({
      past: [
        ...s.past.slice(-(MAX_UNDO - 1)),
        { title: s.title, nodes: s.nodes, edges: s.edges },
      ],
      future: [],
    })),

  undo: () =>
    set((s) => {
      const prev = s.past[s.past.length - 1];
      if (!prev) return {};
      return {
        past: s.past.slice(0, -1),
        future: [
          ...s.future,
          { title: s.title, nodes: s.nodes, edges: s.edges },
        ],
        title: prev.title,
        nodes: prev.nodes,
        edges: prev.edges,
      };
    }),

  redo: () =>
    set((s) => {
      const next = s.future[s.future.length - 1];
      if (!next) return {};
      return {
        future: s.future.slice(0, -1),
        past: [...s.past, { title: s.title, nodes: s.nodes, edges: s.edges }],
        title: next.title,
        nodes: next.nodes,
        edges: next.edges,
      };
    }),

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  setSpec: (spec) => {
    get().takeSnapshot();
    const { nodes, edges } = specToFlow(spec);
    set({ title: spec.title, nodes, edges });
  },

  getSpec: () => flowToSpec(get().title, get().nodes, get().edges),

  reset: () => {
    get().takeSnapshot();
    set({
      title: "Untitled Architecture",
      nodes: [],
      edges: [],
      history: [],
    });
  },

  setTitle: (title) => set({ title }),

  onNodesChange: (changes) =>
    set({ nodes: applyNodeChanges(changes, get().nodes) }),

  onEdgesChange: (changes) =>
    set({ edges: applyEdgeChanges(changes, get().edges) }),

  onConnect: (connection) => {
    get().takeSnapshot();
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
    });
  },

  onReconnect: (oldEdge, newConnection) => {
    get().takeSnapshot();
    set({ edges: reconnectEdge(oldEdge, newConnection, get().edges) });
  },

  addServiceNode: (service) => {
    get().takeSnapshot();
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

  addTextNode: () => {
    get().takeSnapshot();
    const node: AppNode = {
      id: uid("t"),
      type: "text",
      position: { x: 160, y: 160 },
      data: { text: "" },
      style: { width: 180, height: 44 },
    };
    set({ nodes: [...get().nodes, node] });
  },

  updateNodeLabel: (id, label) => {
    get().takeSnapshot();
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? ({ ...n, data: { ...n.data, label } } as AppNode) : n,
      ),
    });
  },

  updateNodeService: (id, service) => {
    get().takeSnapshot();
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? ({ ...n, data: { ...n.data, service } } as AppNode) : n,
      ),
    });
  },

  updateNodeText: (id, text) => {
    get().takeSnapshot();
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? ({ ...n, data: { ...n.data, text } } as AppNode) : n,
      ),
    });
  },

  updateEdgeLabel: (id, label) => {
    get().takeSnapshot();
    set({
      edges: get().edges.map((e) =>
        e.id === id ? { ...e, data: { ...e.data, label }, label } : e,
      ),
    });
  },

  deleteEdge: (id) => {
    get().takeSnapshot();
    set({ edges: get().edges.filter((e) => e.id !== id) });
  },

  deleteNode: (id) => {
    get().takeSnapshot();
    const nodes = get().nodes;
    // Remove the node plus any descendants (e.g. children of a deleted container).
    const toRemove = new Set<string>([id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const n of nodes) {
        if (n.parentId && toRemove.has(n.parentId) && !toRemove.has(n.id)) {
          toRemove.add(n.id);
          changed = true;
        }
      }
    }
    set({
      nodes: nodes.filter((n) => !toRemove.has(n.id)),
      edges: get().edges.filter(
        (e) => !toRemove.has(e.source) && !toRemove.has(e.target),
      ),
    });
  },

  deleteSelected: () => {
    const selectedNodeIds = new Set(
      get().nodes.filter((n) => n.selected).map((n) => n.id),
    );
    if (
      selectedNodeIds.size === 0 &&
      !get().edges.some((e) => e.selected)
    ) {
      return;
    }
    get().takeSnapshot();
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
