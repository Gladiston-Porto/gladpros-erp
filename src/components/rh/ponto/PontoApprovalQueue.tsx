"use client"

// PontoApprovalQueue — fila de aprovações para ADMIN/GERENTE
// Mostra turnos SUBMITTED, AUTO_CLOSED e CORRECTION_PENDING

import { useState, useEffect, useCallback } from "react"
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Edit2,
  RefreshCw,
  ClipboardCheck,
} from "lucide-react"

interface TimeEntryItem {
  id: number
  clockIn: string
  clockOut: string | null
  workDate: string
  workLocation: string
  status: string
  source: string
  totalMinutes: number | null
  regularMinutes: number | null
  overtimeMinutes: number | null
  correctionReason: string | null
  rejectionReason: string | null
  notes: string | null
  worker: {
    id: number
    name: string
    defaultHourlyRate: string
  }
  approvedBy: { nomeCompleto: string } | null
}

interface PaginatedResponse {
  data: TimeEntryItem[]
  pagination: { total: number; page: number; totalPages: number }
  success: boolean
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  SUBMITTED: { label: "Aguardando aprovação", color: "text-yellow-500 bg-yellow-500/10" },
  AUTO_CLOSED: { label: "Fechado pelo sistema", color: "text-orange-500 bg-orange-500/10" },
  CORRECTION_PENDING: { label: "Correção pendente", color: "text-blue-500 bg-blue-500/10" },
}

export default function PontoApprovalQueue() {
  const [entries, setEntries] = useState<TimeEntryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [rejectModal, setRejectModal] = useState<{ id: number } | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [adjustModal, setAdjustModal] = useState<TimeEntryItem | null>(null)
  const [adjustClockIn, setAdjustClockIn] = useState("")
  const [adjustClockOut, setAdjustClockOut] = useState("")
  const [adjustNotes, setAdjustNotes] = useState("")
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null)

  const showToast = (msg: string, type: "ok" | "err") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchPending = useCallback(async () => {
    setLoading(true)
    try {
      const statuses = ["SUBMITTED", "AUTO_CLOSED", "CORRECTION_PENDING"].join(",")
      const res = await fetch(
        `/api/rh/time-entries?status=${statuses}&pageSize=50`
      )
      const data: PaginatedResponse = await res.json()
      if (data.success) setEntries(data.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPending()
  }, [fetchPending])

  const handleApprove = async (id: number) => {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/rh/time-entries/${id}/approve`, { method: "POST" })
      if (res.ok) {
        showToast("Turno aprovado com sucesso", "ok")
        fetchPending()
      } else {
        const d = await res.json()
        showToast(d.message ?? "Erro ao aprovar", "err")
      }
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) return
    setActionLoading(rejectModal.id)
    try {
      const res = await fetch(`/api/rh/time-entries/${rejectModal.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      })
      if (res.ok) {
        showToast("Turno rejeitado", "ok")
        setRejectModal(null)
        setRejectReason("")
        fetchPending()
      } else {
        const d = await res.json()
        showToast(d.message ?? "Erro ao rejeitar", "err")
      }
    } finally {
      setActionLoading(null)
    }
  }

  const openAdjustModal = (entry: TimeEntryItem) => {
    const toLocalInput = (iso: string) => {
      const d = new Date(iso)
      const localStr = d.toLocaleDateString("en-CA", { timeZone: "America/Chicago" }) +
        "T" +
        d.toLocaleTimeString("en-US", { timeZone: "America/Chicago", hour12: false, hour: "2-digit", minute: "2-digit" })
      return localStr
    }
    setAdjustClockIn(toLocalInput(entry.clockIn))
    setAdjustClockOut(entry.clockOut ? toLocalInput(entry.clockOut) : "")
    setAdjustNotes(entry.notes ?? "")
    setAdjustModal(entry)
  }

  const handleAdjust = async () => {
    if (!adjustModal) return
    setActionLoading(adjustModal.id)
    try {
      const toISO = (local: string) => new Date(local).toISOString()
      const res = await fetch(`/api/rh/time-entries/${adjustModal.id}/adjust`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clockIn: toISO(adjustClockIn),
          clockOut: adjustClockOut ? toISO(adjustClockOut) : undefined,
          notes: adjustNotes || undefined,
        }),
      })
      if (res.ok) {
        showToast("Horário ajustado e aprovado", "ok")
        setAdjustModal(null)
        fetchPending()
      } else {
        const d = await res.json()
        showToast(d.message ?? "Erro ao ajustar", "err")
      }
    } finally {
      setActionLoading(null)
    }
  }

  const fmt = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleTimeString("en-US", {
          timeZone: "America/Chicago",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "—"

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      timeZone: "America/Chicago",
      weekday: "short",
      month: "short",
      day: "numeric",
    })

  const fmtHours = (min: number | null) =>
    min != null ? `${(min / 60).toFixed(1)}h` : "—"

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
          <ClipboardCheck className="w-4 h-4 text-brand-primary" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase">
            Pendentes ({entries.length})
          </h2>
        </div>
        <button
          onClick={fetchPending}
          aria-label="Atualizar lista"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-2xl bg-card border border-border p-10 text-center">
          <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">Tudo aprovado!</p>
          <p className="text-xs text-muted-foreground mt-1">Nenhum turno aguardando revisão.</p>
        </div>
      ) : (
        entries.map((entry) => {
          const statusInfo = STATUS_LABELS[entry.status] ?? {
            label: entry.status,
            color: "text-muted-foreground bg-muted",
          }
          const isAutoClose = entry.source === "AUTO_CLOSED"

          return (
            <div
              key={entry.id}
              className="rounded-2xl bg-card border border-border p-4 space-y-3"
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-foreground">{entry.worker.name}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(entry.workDate)}</p>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${statusInfo.color}`}
                >
                  {statusInfo.label}
                </span>
              </div>

              {/* Time row */}
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {fmt(entry.clockIn)} → {fmt(entry.clockOut)}
                  </span>
                </div>
                <span className="text-foreground font-medium">{fmtHours(entry.totalMinutes)}</span>
                {(entry.overtimeMinutes ?? 0) > 0 && (
                  <span className="text-xs text-orange-500">
                    +{fmtHours(entry.overtimeMinutes)} OT
                  </span>
                )}
              </div>

              {/* System close warning */}
              {isAutoClose && (
                <div className="flex items-start gap-2 bg-orange-500/5 border border-orange-500/20 rounded-xl p-3">
                  <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-orange-600">
                    Turno fechado pelo sistema automaticamente (12h estimado). Verifique se o
                    horário está correto antes de aprovar.
                  </p>
                </div>
              )}

              {/* Correction reason */}
              {entry.correctionReason && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
                  <p className="text-xs text-blue-600">
                    <strong>Justificativa:</strong> {entry.correctionReason}
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => handleApprove(entry.id)}
                  disabled={actionLoading === entry.id}
                  aria-label="Aprovar turno"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors text-xs font-medium disabled:opacity-50"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Aprovar
                </button>

                {isAutoClose && (
                  <button
                    onClick={() => openAdjustModal(entry)}
                    disabled={actionLoading === entry.id}
                    aria-label="Ajustar horário"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 transition-colors text-xs font-medium disabled:opacity-50"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Ajustar
                  </button>
                )}

                <button
                  onClick={() => setRejectModal({ id: entry.id })}
                  disabled={actionLoading === entry.id}
                  aria-label="Rejeitar turno"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-xs font-medium disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Rejeitar
                </button>
              </div>
            </div>
          )
        })
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <h3 className="text-base font-semibold text-foreground">Rejeitar turno</h3>
            <p className="text-sm text-muted-foreground">
              Informe o motivo da rejeição. O worker será notificado.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ex: Horário inconsistente com registros do projeto..."
              aria-label="Motivo da rejeição"
              className="w-full rounded-xl border border-border bg-background text-foreground text-sm p-3 resize-none h-24 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
            <div className="flex gap-2">
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading !== null}
                aria-label="Confirmar rejeição"
                className="flex-1 py-2.5 rounded-xl bg-destructive text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                Confirmar
              </button>
              <button
                onClick={() => { setRejectModal(null); setRejectReason("") }}
                aria-label="Cancelar rejeição"
                className="flex-1 py-2.5 rounded-xl bg-card border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Modal */}
      {adjustModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <h3 className="text-base font-semibold text-foreground">Ajustar horário</h3>
            <p className="text-xs text-muted-foreground">Worker: {adjustModal.worker.name}</p>

            <div className="space-y-3">
              <div>
                <label htmlFor="adjust-clockin" className="text-xs text-muted-foreground block mb-1">
                  Entrada
                </label>
                <input
                  id="adjust-clockin"
                  type="datetime-local"
                  value={adjustClockIn}
                  onChange={(e) => setAdjustClockIn(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background text-foreground text-sm p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              <div>
                <label htmlFor="adjust-clockout" className="text-xs text-muted-foreground block mb-1">
                  Saída
                </label>
                <input
                  id="adjust-clockout"
                  type="datetime-local"
                  value={adjustClockOut}
                  onChange={(e) => setAdjustClockOut(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background text-foreground text-sm p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              <div>
                <label htmlFor="adjust-notes" className="text-xs text-muted-foreground block mb-1">
                  Observação (opcional)
                </label>
                <input
                  id="adjust-notes"
                  type="text"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="Motivo do ajuste..."
                  className="w-full rounded-xl border border-border bg-background text-foreground text-sm p-2.5 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAdjust}
                disabled={!adjustClockIn || actionLoading !== null}
                aria-label="Salvar ajuste"
                className="flex-1 py-2.5 rounded-xl bg-brand-primary text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                Salvar e Aprovar
              </button>
              <button
                onClick={() => setAdjustModal(null)}
                aria-label="Cancelar ajuste"
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
