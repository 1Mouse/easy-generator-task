"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { Node, Edge } from "@xyflow/react"
import type * as Y from "yjs"

type NodeData = {
  name: string
  count: number
}

export type GraphNode = Node<NodeData>
export type GraphEdge = Edge

export function useYjsGraph(doc: Y.Doc | null, synced: boolean) {
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const suppressRef = useRef(false)

  // Sync from Yjs -> React state
  useEffect(() => {
    if (!doc || !synced) return

    const nodesMap = doc.getMap("nodes")
    const edgesMap = doc.getMap("edges")

    const syncNodes = () => {
      if (suppressRef.current) return
      const result: GraphNode[] = []
      nodesMap.forEach((value, key) => {
        result.push(value as GraphNode)
      })
      setNodes(result)
    }

    const syncEdges = () => {
      if (suppressRef.current) return
      const result: GraphEdge[] = []
      edgesMap.forEach((value, key) => {
        result.push(value as GraphEdge)
      })
      setEdges(result)
    }

    // Initial sync
    syncNodes()
    syncEdges()

    nodesMap.observe(syncNodes)
    edgesMap.observe(syncEdges)

    return () => {
      nodesMap.unobserve(syncNodes)
      edgesMap.unobserve(syncEdges)
    }
  }, [doc, synced])

  const updateNodePosition = useCallback(
    (nodeId: string, position: { x: number; y: number }) => {
      if (!doc) return
      const nodesMap = doc.getMap("nodes")
      const existing = nodesMap.get(nodeId) as GraphNode | undefined
      if (existing) {
        suppressRef.current = true
        nodesMap.set(nodeId, { ...existing, position })
        suppressRef.current = false
      }
    },
    [doc]
  )

  const updateNodeData = useCallback(
    (nodeId: string, data: NodeData) => {
      if (!doc) return
      const nodesMap = doc.getMap("nodes")
      const existing = nodesMap.get(nodeId) as GraphNode | undefined
      if (existing) {
        nodesMap.set(nodeId, { ...existing, data })
      }
    },
    [doc]
  )

  const deleteNode = useCallback(
    (nodeId: string) => {
      if (!doc) return
      doc.transact(() => {
        const nodesMap = doc.getMap("nodes")
        const edgesMap = doc.getMap("edges")
        nodesMap.delete(nodeId)
        // Remove connected edges
        edgesMap.forEach((edge, key) => {
          const e = edge as GraphEdge
          if (e.source === nodeId || e.target === nodeId) {
            edgesMap.delete(key)
          }
        })
      })
    },
    [doc]
  )

  const addNode = useCallback(
    (position: { x: number; y: number }) => {
      if (!doc) return
      const nodesMap = doc.getMap("nodes")
      const id = crypto.randomUUID().slice(0, 8)
      const newNode: GraphNode = {
        id,
        type: "custom",
        position,
        data: { name: `Node ${id.slice(0, 4)}`, count: 0 },
      }
      nodesMap.set(id, newNode)
      return id
    },
    [doc]
  )

  const addEdge = useCallback(
    (source: string, target: string) => {
      if (!doc) return
      const edgesMap = doc.getMap("edges")
      const id = `e-${source}-${target}`
      edgesMap.set(id, { id, source, target })
    },
    [doc]
  )

  return {
    nodes,
    edges,
    setNodes,
    setEdges,
    updateNodePosition,
    updateNodeData,
    deleteNode,
    addNode,
    addEdge,
  }
}
