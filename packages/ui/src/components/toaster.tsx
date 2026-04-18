"use client"

// Adapter to the core Toast implementation to avoid duplicate contexts
import React from "react"
import { useToast as useToastCore, ToastProvider as CoreToastProvider } from "./toast"

type ToastType = "success" | "error" | "info" | "warning"
type ToastOpts = { title?: string; message?: string; type?: ToastType; duration?: number }

export function useToast() {
  const core = useToastCore()

  const showToast = React.useCallback(({ title, message, type = "info", duration }: ToastOpts) => {
    if (typeof duration === "number") {
      // Use low-level API to honor custom duration
      core.addToast({ title: title ?? "", message, type, duration })
      return
    }
    switch (type) {
      case "success":
        core.success(title ?? "Sucesso", message)
        break
      case "error":
        core.error(title ?? "Erro", message)
        break
      case "warning":
        core.warning(title ?? "Aviso", message)
        break
      default:
        core.info(title ?? "", message)
    }
  }, [core])

  return { showToast }
}

// Re-export the core provider to ensure a single source of truth
export default function ToastProvider({ children }: { children: React.ReactNode }) {
  return <CoreToastProvider>{children}</CoreToastProvider>
}
