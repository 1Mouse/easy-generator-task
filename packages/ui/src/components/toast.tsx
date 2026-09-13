"use client"

import * as React from "react"
import { Toast as ToastPrimitive } from "@base-ui/react/toast"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@workspace/ui/lib/utils"

const toastVariants = cva(
  "pointer-events-auto absolute inset-x-0 bottom-0 z-[calc(1000-var(--toast-index))] mt-auto flex w-full flex-col gap-1 rounded-none border bg-popover p-3 text-popover-foreground shadow-lg transition-all duration-200 select-none after:absolute after:bottom-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-[''] data-[ending-style]:[transform:translateY(150%)] data-[ending-style]:opacity-0 data-[starting-style]:[transform:translateY(150%)] data-[starting-style]:opacity-0 [&:not([data-limited])]:[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)+calc(min(var(--toast-index),10)*-15px)))_scale(calc(max(0,1-(var(--toast-index)*0.1))))]",
  {
    variants: {
      tone: {
        default: "border-border",
        error: "border-destructive/50 bg-destructive/10 text-foreground",
        success: "border-primary/50",
      },
    },
    defaultVariants: { tone: "default" },
  }
)

type ToastTone = NonNullable<VariantProps<typeof toastVariants>["tone"]>

/**
 * The toast `type` doubles as our visual tone, so callers just pass
 * `toast.add({ type: "error", ... })` and get the right styling.
 */
function toneOf(type: string | undefined): ToastTone {
  return type === "error" || type === "success" ? type : "default"
}

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager()

  return toasts.map((toast) => (
    <ToastPrimitive.Root
      key={toast.id}
      toast={toast}
      data-slot="toast"
      className={toastVariants({ tone: toneOf(toast.type) })}
      style={{ "--gap": "0.75rem" } as React.CSSProperties}
    >
      <ToastPrimitive.Title
        data-slot="toast-title"
        className="text-xs font-semibold"
      />
      <ToastPrimitive.Description
        data-slot="toast-description"
        className="text-xs text-muted-foreground"
      />
      <ToastPrimitive.Close
        data-slot="toast-close"
        aria-label="Dismiss"
        className="absolute top-2 right-2 text-muted-foreground transition-colors hover:text-foreground"
      >
        <svg viewBox="0 0 16 16" className="size-3" aria-hidden="true">
          <path
            d="M4 4l8 8M12 4l-8 8"
            stroke="currentColor"
            strokeWidth="1.75"
            fill="none"
          />
        </svg>
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  ))
}

/**
 * Drop once near the root. Renders the viewport itself, so apps only need
 * `<ToastProvider>{children}</ToastProvider>` plus `useToast()` at call sites.
 */
function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <ToastPrimitive.Provider>
      {children}
      <ToastPrimitive.Portal>
        <ToastPrimitive.Viewport
          data-slot="toast-viewport"
          className="fixed top-auto right-4 bottom-4 z-50 mx-auto flex w-64 sm:right-8 sm:bottom-8 sm:w-80"
        >
          <ToastList />
        </ToastPrimitive.Viewport>
      </ToastPrimitive.Portal>
    </ToastPrimitive.Provider>
  )
}

const useToast = ToastPrimitive.useToastManager

export { ToastProvider, useToast, toastVariants }
