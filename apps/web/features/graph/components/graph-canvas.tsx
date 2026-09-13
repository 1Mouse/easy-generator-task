"use client"

import { useCallback, useMemo, useState } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  type OnConnect,
  type NodeMouseHandler,
  type OnNodeDrag,
  type NodeChange,
  type EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import { useYjs } from "../hooks/use-yjs"
import { useYjsGraph, type GraphNode } from "../hooks/use-yjs-graph"
import { CustomNode } from "./custom-node"
import { ContextMenu } from "./context-menu"
import { NodeDrawer } from "./node-drawer"

const nodeTypes = { custom: CustomNode }

export function GraphCanvas() {
  const { doc, synced, connected } = useYjs("graph-room")
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    updateNodePosition,
    updateNodeData,
    deleteNode,
    addNode,
    addEdge,
  } = useYjsGraph(doc, synced)

  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    nodeId: string
  } | null>(null)

  const [editingNode, setEditingNode] = useState<GraphNode | null>(null)

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds) as GraphNode[])
    },
    [setNodes]
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds))
    },
    [setEdges]
  )

  const onNodeDragStop: OnNodeDrag = useCallback(
    (_event, node) => {
      updateNodePosition(node.id, node.position)
    },
    [updateNodePosition]
  )

  const onConnect: OnConnect = useCallback(
    (connection) => {
      if (connection.source && connection.target) {
        addEdge(connection.source, connection.target)
      }
    },
    [addEdge]
  )

  const onNodeContextMenu: NodeMouseHandler = useCallback((event, node) => {
    event.preventDefault()
    setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id })
  }, [])

  const onPaneClick = useCallback(() => {
    setContextMenu(null)
  }, [])

  const handleEditNode = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId)
      if (node) setEditingNode(node)
    },
    [nodes]
  )

  const handleDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      // Add node on double-click on pane
      const bounds = (event.target as HTMLElement)
        .closest(".react-flow")
        ?.getBoundingClientRect()
      if (bounds) {
        addNode({
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top,
        })
      }
    },
    [addNode]
  )

  const statusColor = connected ? "bg-emerald-500" : "bg-red-500"

  return (
    <div className="relative h-screen w-full">
      {/* Connection status */}
      <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs shadow-sm">
        <div className={`h-2 w-2 rounded-full ${statusColor}`} />
        {connected ? "Connected" : "Disconnected"}
        {synced && " · Synced"}
      </div>

      {/* Hint */}
      <div className="absolute left-4 top-14 z-10 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
        Double-click to add node · Right-click node for menu · Drag handles to
        connect
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        onDoubleClick={handleDoubleClick}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          onDelete={deleteNode}
          onEdit={handleEditNode}
          onClose={() => setContextMenu(null)}
        />
      )}

      <NodeDrawer
        node={editingNode}
        onUpdate={updateNodeData}
        onClose={() => setEditingNode(null)}
      />
    </div>
  )
}
