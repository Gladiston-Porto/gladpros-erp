"use client"

import React, { createContext, useCallback, useContext, useRef, useState } from "react"

type ConfirmOpts = { title?: string; message?: string; confirmText?: string; cancelText?: string; tone?: "danger" | "default" }

type ConfirmCtx = { confirm: (opts?: ConfirmOpts) => Promise<boolean>; Dialog: React.FC }

const Ctx = createContext<ConfirmCtx | undefined>(undefined)

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [opts, setOpts] = useState<ConfirmOpts>({})
  const resolverRef = useRef<((v: boolean) => void) | undefined>(undefined)

  const confirm = useCallback((o?: ConfirmOpts) => {
    setOpts(o || {})
    setOpen(true)
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  const resolveWith = (v: boolean) => {
    setOpen(false)
    const r = resolverRef.current
    resolverRef.current = undefined
    if (r) r(v)
  }

  const Dialog: React.FC = () => {
    if (!open) return null
    const title = opts.title || "Confirmar"
    const message = opts.message || "Deseja prosseguir?"
    const confirmText = opts.confirmText || "Confirmar"
    const cancelText = opts.cancelText || "Cancelar"
    const danger = opts.tone === "danger"
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => resolveWith(false)} />
        <div className="relative z-[10000] w-full max-w-sm overflow-hidden rounded-xl border bg-card text-card-foreground p-5 shadow-elevated animate-scale-in">
          <h3 className="mb-2 text-lg font-semibold">{title}</h3>
          <p className="mb-5 text-sm text-muted-foreground">{message}</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => resolveWith(false)} className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors duration-150 cursor-pointer">{cancelText}</button>
            <button onClick={() => resolveWith(true)} className={`rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors duration-150 cursor-pointer ${danger ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90"}`}>{confirmText}</button>
          </div>
        </div>
      </div>
    )
  }

  return <Ctx.Provider value={{ confirm, Dialog }}>{children}</Ctx.Provider>
}

export function useConfirm() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useConfirm must be used inside ConfirmProvider")
  return ctx
}

export default ConfirmProvider
