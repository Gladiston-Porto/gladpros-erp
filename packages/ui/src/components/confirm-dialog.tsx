"use client"

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { AlertTriangle, Info, X } from "lucide-react"

/* ---------- subject card (avatar + name + description) ---------- */
const AVATAR_PALETTE = [
  "bg-sky-600", "bg-teal-600", "bg-orange-600",
  "bg-indigo-600", "bg-emerald-600", "bg-rose-600",
]

function subjectInitials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]?.toUpperCase() ?? "").join("")
}

function subjectAvatarBg(name: string): string {
  const idx = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % AVATAR_PALETTE.length
  return AVATAR_PALETTE[idx]
}

/* ---------- types ---------- */
export type ConfirmSubject = {
  name: string
  description?: string          // email, número do projeto, etc.
  avatarUrl?: string | null
}

type ConfirmOpts = {
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  tone?: "danger" | "default"
  /** Card da entidade afetada — mostra avatar/iniciais + nome + descrição */
  subject?: ConfirmSubject
  /** Nota de impacto exibida abaixo do card (ex: "Os dados serão preservados.") */
  impactNote?: string
}

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
    const cancelBtnRef = useRef<HTMLButtonElement>(null)
    const confirmBtnRef = useRef<HTMLButtonElement>(null)
    const titleId = "confirm-dialog-title"
    const descId = "confirm-dialog-desc"

    useEffect(() => {
      if (!open) return
      cancelBtnRef.current?.focus()
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") resolveWith(false)
        if (e.key === "Tab") {
          const focusable = [cancelBtnRef.current, confirmBtnRef.current].filter(Boolean) as HTMLElement[]
          if (focusable.length === 0) return
          const first = focusable[0]
          const last = focusable[focusable.length - 1]
          if (e.shiftKey) {
            if (document.activeElement === first) { e.preventDefault(); last.focus() }
          } else {
            if (document.activeElement === last) { e.preventDefault(); first.focus() }
          }
        }
      }
      document.addEventListener("keydown", handleKey)
      return () => document.removeEventListener("keydown", handleKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    if (!open) return null

    const title = opts.title || "Confirmar"
    const message = opts.message || "Deseja prosseguir?"
    const confirmText = opts.confirmText || "Confirmar"
    const cancelText = opts.cancelText || "Cancelar"
    const danger = opts.tone === "danger"
    const { subject, impactNote } = opts

    return (
      <div
        className="fixed inset-0 z-9999 flex items-center justify-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" onClick={() => resolveWith(false)} />
        <div className="relative z-10000 w-full max-w-sm overflow-hidden rounded-xl border bg-card text-card-foreground p-5 shadow-elevated animate-scale-in">

          {/* Header: ícone + título + botão fechar */}
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              {danger && <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />}
              <h3 id={titleId} className="text-lg font-semibold leading-tight">{title}</h3>
            </div>
            <button
              onClick={() => resolveWith(false)}
              aria-label="Fechar"
              className="rounded-md p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Mensagem */}
          <p id={descId} className="mb-4 text-sm text-muted-foreground">{message}</p>

          {/* Card da entidade afetada */}
          {subject && (
            <div className="mb-3 flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
              {subject.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={subject.avatarUrl}
                  alt={subject.name}
                  className="h-9 w-9 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white ${subjectAvatarBg(subject.name)}`}>
                  {subjectInitials(subject.name)}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{subject.name}</p>
                {subject.description && (
                  <p className="truncate text-xs text-muted-foreground">{subject.description}</p>
                )}
              </div>
            </div>
          )}

          {/* Nota de impacto */}
          {impactNote && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/8 px-3 py-2.5">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" aria-hidden="true" />
              <p className="text-xs text-destructive">{impactNote}</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-2">
            <button
              ref={cancelBtnRef}
              onClick={() => resolveWith(false)}
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors duration-150 cursor-pointer"
            >
              {cancelText}
            </button>
            <button
              ref={confirmBtnRef}
              onClick={() => resolveWith(true)}
              className={`rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors duration-150 cursor-pointer ${danger ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90"}`}
            >
              {confirmText}
            </button>
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
