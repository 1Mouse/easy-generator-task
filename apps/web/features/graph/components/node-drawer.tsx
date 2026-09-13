"use client"

import { useCallback, useEffect, useState } from "react"
import type { GraphNode } from "../hooks/use-yjs-graph"

type NodeDrawerProps = {
  node: GraphNode | null
  onUpdate: (nodeId: string, data: { name: string; count: number }) => void
  onClose: () => void
}

export function NodeDrawer({ node, onUpdate, onClose }: NodeDrawerProps) {
  const [name, setName] = useState("")
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (node) {
      setName(node.data.name)
      setCount(node.data.count)
    }
  }, [node])

  const handleSave = useCallback(() => {
    if (!node) return
    onUpdate(node.id, { name, count })
    onClose()
  }, [node, name, count, onUpdate, onClose])

  if (!node) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-80 flex-col border-l border-border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Edit Node</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 4L12 12M12 4L4 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="text-xs text-muted-foreground">ID: {node.id}</div>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium">Count</span>
            <input
              type="number"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
        </div>

        <div className="border-t border-border px-4 py-3">
          <button
            onClick={handleSave}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Save & Close
          </button>
        </div>
      </div>
    </>
  )
}
