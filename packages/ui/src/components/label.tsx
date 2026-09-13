"use client"

import * as React from "react"
import { Field as FieldPrimitive } from "@base-ui/react/field"

import { cn } from "@workspace/ui/lib/utils"

function Label({
  className,
  ...props
}: React.ComponentProps<typeof FieldPrimitive.Label>) {
  return (
    <FieldPrimitive.Label
      data-slot="label"
      className={cn(
        "flex items-center gap-1.5 text-xs leading-none font-medium select-none group-data-[disabled]/field:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Label }
