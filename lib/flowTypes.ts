import type { Node, Edge } from "@xyflow/react";

export interface ServiceNodeData {
  label: string;
  service: string;
  [key: string]: unknown;
}

export interface ContainerNodeData {
  label: string;
  service: string;
  [key: string]: unknown;
}

export type ServiceFlowNode = Node<ServiceNodeData, "service">;
export type ContainerFlowNode = Node<ContainerNodeData, "container">;
export type AppNode = ServiceFlowNode | ContainerFlowNode;

export interface AppEdgeData {
  label?: string;
  [key: string]: unknown;
}

export type AppEdge = Edge<AppEdgeData>;
