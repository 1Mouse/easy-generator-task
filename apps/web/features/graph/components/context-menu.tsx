"use client"

import { useCallback, useEffect, useRef } from "react"

type ContextMenuProps = {
  x: number
  y: number
  nodeId: string
  onDelete: (nodeId: string) => void
  onEdit: (nodeId: string) => void
  onClose: () => void
}

export function ContextMenu({ x, y, nodeId, onDelete, onEdit, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [onClose])

  const handleDelete = useCallback(() => {
    onDelete(nodeId)
    onClose()
  }, [nodeId, onDelete, onClose])

  const handleEdit = useCallback(() => {
    onEdit(nodeId)
    onClose()
  }, [nodeId, onEdit, onClose])

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[160px] rounded-md border border-border bg-popover p-1 shadow-md"
      style={{ left: x, top: y }}
    >
      <button
        onClick={handleEdit}
        className="flex w-full items-center rounded-sm px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
      >
        Edit Node
      </button>
      <button
        onClick={handleDelete}
        className="flex w-full items-center rounded-sm px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
      >
        Delete Node
      </button>
    </div>
  )
}
