"use client"

// PontoInfractions — histórico de infrações para ADMIN/GERENTE
// Permite abonar penalidades com justificativa

import { useState, useEffect, useCallback } from "react"
import { AlertTriangle, CheckCircle, RefreshCw, Shield } from "lucide-react"

interface Infraction {
  id: number
  type: string
  occurredAt: string
  cycleNumber: number
  cyclePosition: number
  penaltyApplied: boolean
  penaltyAmount: string | null
  waived: boolean
  waivedAt: string | null
  waivedReason: string | null
  alertSentToAdmin: boolean
  worker: {
    id: number
    name: string | null
    usuario: { nomeCompleto: string | null } | null
  }
  waivedBy: { nomeCompleto: string | null } | null
}

const TYPE_LABELS: Record<string, string> = {
  FORGOT_CLOCK_OUT: "Esqueceu de registrar saída",
  FORGOT_CLOCK_IN: "Esqueceu de registrar entrada",
}

const fmt$ = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })

export default function PontoInfractions() {
  const [infractions, setInfractions] = useState<Infraction[]>([])
  const [loading, setLoading] = useState(true)
  const [waiveModal, setWaiveModal] = useState<{ id: number; workerName: string } | null>(null)
  const [waiveReason, setWaiveReason] = useState("")
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null)

  const showToast = (msg: string, type: "ok" | "err") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchInfractions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/rh/infractions?pageSize=50")
      const data = await res.json()
      if (data.success) setInfractions(data.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInfractions()
  }, [fetchInfractions])

  const handleWaive = async () => {
    if (!waiveModal || !waiveReason.trim()) return
    setActionLoading(waiveModal.id)
    try {
      const res = await fetch(`/api/rh/infractions/${waiveModal.id}/waive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: waiveReason }),
      })
      if (res.ok) {
        showToast("Penalidade abonada com sucesso", "ok")
        setWaiveModal(null)
        setWaiveReason("")
        fetchInfractions()
      } else {
        const d = await res.json()
        showToast(d.message ?? "Erro ao abonar", "err")
      }
    } finally {
      setActionLoading(null)
    }
  }

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      timeZone: "America/Chicago",
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-4 relative">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl text-sm font-medium shadow-lg ${
            toast.type === "ok"
              ? "bg-green-500/10 text-green-600 border border-green-500/20"
              : "bg-destructive/10 text-destructive border border-destructive/20"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase">
            Infrações ({infractions.length})
          </h2>
        </div>
        <button
          onClick={fetchInfractions}
          aria-label="Atualizar infrações"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {infractions.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border p-10 text-center">
          <Shield className="w-10 h-10 text-green-500 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Nenhuma infração registrada</p>
          <p className="text-xs text-muted-foreground mt-1">A equipe está 100% em conformidade.</p>
        </div>
      ) : (
        infractions.map((inf) => {
          const workerName = inf.worker.name ?? inf.worker.usuario?.nomeCompleto ?? `#${inf.worker.id}`

          return (
            <div
              key={inf.id}
              className={`rounded-2xl bg-card border p-4 space-y-2 ${
                inf.waived ? "border-border opacity-60" : "border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{workerName}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(inf.occurredAt)}</p>
                </div>
                {inf.waived ? (
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-500/10 text-green-600 shrink-0">
                    Abonado
                  </span>
                ) : inf.penaltyApplied ? (
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-destructive/10 text-destructive shrink-0">
                    Penalidade
                  </span>
                ) : (
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-600 shrink-0">
                    Aviso {inf.cyclePosition}/3
                  </span>
                )}
              </div>

              <p className="text-xs text-muted-foreground">{TYPE_LABELS[inf.type] ?? inf.type}</p>

              {inf.penaltyApplied && inf.penaltyAmount && !inf.waived && (
                <p className="text-sm font-medium text-destructive">
                  Penalidade: {fmt$(Number(inf.penaltyAmount))}
                </p>
              )}

              {inf.waived && inf.waivedReason && (
                <p className="text-xs text-muted-foreground">
                  Abonado por {inf.waivedBy?.nomeCompleto ?? "—"}: {inf.waivedReason}
                </p>
              )}

              {/* Waive button — only for unwaived penalties */}
              {inf.penaltyApplied && !inf.waived && (
                <div className="pt-1">
                  <button
                    onClick={() => setWaiveModal({ id: inf.id, workerName })}
                    aria-label="Abonar penalidade"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors text-xs font-medium"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Abonar penalidade
                  </button>
                </div>
              )}
            </div>
          )
        })
      )}

      {/* Waive Modal */}
      {waiveModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <h3 className="text-base font-semibold text-foreground">Abonar penalidade</h3>
            <p className="text-sm text-muted-foreground">
              Worker: <strong>{waiveModal.workerName}</strong>. A penalidade financeira será
              cancelada, mas a infração permanece no histórico.
            </p>
            <textarea
              value={waiveReason}
              onChange={(e) => setWaiveReason(e.target.value)}
              placeholder="Justificativa para abonar..."
              aria-label="Justificativa para abonar"
              className="w-full rounded-xl border border-border bg-background text-foreground text-sm p-3 resize-none h-24 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
            <div className="flex gap-2">
              <button
                onClick={handleWaive}
                disabled={!waiveReason.trim() || actionLoading !== null}
                aria-label="Confirmar abono"
                className="flex-1 py-2.5 rounded-xl bg-green-500 text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                Confirmar
              </button>
              <button
                onClick={() => { setWaiveModal(null); setWaiveReason("") }}
                aria-label="Cancelar abono"
                className="flex-1 py-2.5 rounded-xl bg-card border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
