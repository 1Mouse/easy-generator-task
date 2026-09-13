"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"

type CustomNodeData = {
  name: string
  count: number
}

function CustomNodeComponent({ data }: NodeProps) {
  const { name, count } = data as unknown as CustomNodeData

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
      <div className="text-sm font-medium">{name}</div>
      <div className="mt-1 text-xs text-muted-foreground">Count: {count}</div>
      <Handle type="target" position={Position.Top} className="!bg-primary" />
      <Handle type="source" position={Position.Bottom} className="!bg-primary" />
    </div>
  )
}

export const CustomNode = memo(CustomNodeComponent)
