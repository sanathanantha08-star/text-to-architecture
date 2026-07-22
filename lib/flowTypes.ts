import type { Node, Edge } from "@xyflow/react";

export interface ServiceNodeData {
  label: string;
  service: string;
  /** Optional free-text note shown inside the node. */
  text?: string;
  [key: string]: unknown;
}

export interface ContainerNodeData {
  label: string;
  service: string;
  [key: string]: unknown;
}

/** A free-floating annotation box that can be dropped anywhere on the canvas. */
export interface TextNodeData {
  text: string;
  [key: string]: unknown;
}

export type ServiceFlowNode = Node<ServiceNodeData, "service">;
export type ContainerFlowNode = Node<ContainerNodeData, "container">;
export type TextFlowNode = Node<TextNodeData, "text">;
export type AppNode = ServiceFlowNode | ContainerFlowNode | TextFlowNode;

export interface AppEdgeData {
  label?: string;
  [key: string]: unknown;
}

export type AppEdge = Edge<AppEdgeData>;
