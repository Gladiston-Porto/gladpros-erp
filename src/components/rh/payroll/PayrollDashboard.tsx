"use client"

// PayrollDashboard — client component for payroll management
// Lists periods on the left, shows detail on the right

import { useState, useEffect, useCallback } from "react"
import {
  DollarSign,
  Calendar,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  Lock,
  Plus,
  RefreshCw,
  ChevronRight,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface PayrollPeriod {
  id: number
  startDate: string
  endDate: string
  status: "OPEN" | "CLOSED"
  closedAt: string | null
  notes: string | null
  createdAt: string
  closedBy: { nomeCompleto: string } | null
  _count: { entries: number }
}

interface PayrollEntry {
  id: number
  workerId: number
  hourlyRate: string
  regularMinutes: number
  overtimeMinutes: number
  regularPay: string
  overtimePay: string
  penaltyDeductions: string
  grossPay: string
  status: string
  worker: { id: number; name: string; classification: string; compensationModel: string }
}

interface PeriodDetail {
  id: number
  startDate: string
  endDate: string
  status: "OPEN" | "CLOSED"
  closedAt: string | null
  notes: string | null
  closedBy: { nomeCompleto: string } | null
  entries: PayrollEntry[]
}

interface User {
  id: number
  role: string
  empresaId: number
}

// ─── Formatters ───────────────────────────────────────────────────────────────

const usd = (value: number | string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value))

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    year: "numeric",
  })

const fmtMinutes = (min: number) => {
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

// ─── Novo Período Modal ────────────────────────────────────────────────────────

function NewPeriodModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/rh/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, endDate, notes: notes || undefined }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.message ?? "Erro ao criar período")
      } else {
        onCreated()
        onClose()
      }
    } catch {
      setError("Erro de conexão")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-label="Novo Período de Payroll"
    >
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-lg font-semibold text-foreground mb-4">Novo Período de Payroll</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="startDate" className="block text-sm text-muted-foreground mb-1">
              Data Início
            </label>
            <input
              id="startDate"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-12 px-3 rounded-xl border border-border bg-background text-foreground"
              aria-label="Data de início do período"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm text-muted-foreground mb-1">
              Data Fim
            </label>
            <input
              id="endDate"
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-12 px-3 rounded-xl border border-border bg-background text-foreground"
              aria-label="Data de fim do período"
            />
          </div>
          <div>
            <label htmlFor="notes" className="block text-sm text-muted-foreground mb-1">
              Notas (opcional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground resize-none"
              aria-label="Notas do período"
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 rounded-xl border border-border text-foreground text-sm font-medium"
              aria-label="Cancelar criação de período"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-12 rounded-xl bg-brand-primary text-white text-sm font-medium disabled:opacity-50"
              aria-label="Confirmar criação do período"
            >
              {loading ? "Criando…" : "Criar Período"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PayrollDashboard({ user }: { user: User }) {
  const isAdmin = user.role === "ADMIN"

  const [periods, setPeriods] = useState<PayrollPeriod[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<PeriodDetail | null>(null)
  const [loadingPeriods, setLoadingPeriods] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [closing, setClosing] = useState(false)
  const [calcResult, setCalcResult] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  const fetchPeriods = useCallback(async () => {
    setLoadingPeriods(true)
    try {
      const res = await fetch("/api/rh/payroll?pageSize=50&page=1")
      const data = await res.json()
      if (data.success) setPeriods(data.data)
    } finally {
      setLoadingPeriods(false)
    }
  }, [])

  const fetchDetail = useCallback(async (id: number) => {
    setLoadingDetail(true)
    setDetail(null)
    setCalcResult(null)
    try {
      const res = await fetch(`/api/rh/payroll/${id}`)
      const data = await res.json()
      if (data.success) setDetail(data.data)
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  useEffect(() => {
    fetchPeriods()
  }, [fetchPeriods])

  useEffect(() => {
    if (selectedId !== null) fetchDetail(selectedId)
  }, [selectedId, fetchDetail])

  const handleCalculate = async () => {
    if (!selectedId) return
    setCalculating(true)
    setCalcResult(null)
    try {
      const res = await fetch("/api/rh/payroll/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodId: selectedId }),
      })
      const data = await res.json()
      if (data.success) {
        const { entriesCreated, entriesUpdated, totalGrossPay, workersWithMissingRate } = data.data
        let msg = `✅ ${entriesCreated} criados, ${entriesUpdated} atualizados. Total: ${usd(totalGrossPay)}`
        if (workersWithMissingRate.length > 0) {
          msg += `. ⚠️ Taxa ausente: ${workersWithMissingRate.join(", ")}`
        }
        setCalcResult(msg)
        await fetchDetail(selectedId)
        await fetchPeriods()
      } else {
        setCalcResult(`❌ ${data.message}`)
      }
    } catch {
      setCalcResult("❌ Erro de conexão")
    } finally {
      setCalculating(false)
    }
  }

  const handleClose = async () => {
    if (!selectedId) return
    if (!confirm("Fechar este período? Esta ação não pode ser desfeita.")) return
    setClosing(true)
    try {
      const res = await fetch(`/api/rh/payroll/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close" }),
      })
      const data = await res.json()
      if (data.success) {
        await fetchPeriods()
        await fetchDetail(selectedId)
      }
    } finally {
      setClosing(false)
    }
  }

  // Compute stats from loaded data
  const openPeriods = periods.filter((p) => p.status === "OPEN").length
  const totalWorkers = detail?.entries.length ?? 0
  const currentGross = detail?.entries.reduce((acc, e) => acc + Number(e.grossPay), 0) ?? 0

  return (
    <>
      {showModal && (
        <NewPeriodModal
          onClose={() => setShowModal(false)}
          onCreated={() => {
            fetchPeriods()
          }}
        />
      )}

      {/* ── Stats Row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center">
            <Calendar className="w-6 h-6 text-brand-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Períodos Abertos</p>
            <p className="text-2xl font-bold text-foreground">{openPeriods}</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
            <Users className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Workers no Período</p>
            <p className="text-2xl font-bold text-foreground">{totalWorkers}</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-secondary/10 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-brand-secondary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Gross Pay (Período)</p>
            <p className="text-2xl font-bold text-foreground">{usd(currentGross)}</p>
          </div>
        </div>
      </div>

      {/* ── Two-Column Layout ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Period List */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Períodos</h2>
              {isAdmin && (
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-1 h-9 px-3 rounded-xl bg-brand-primary text-white text-sm font-medium"
                  aria-label="Criar novo período de payroll"
                >
                  <Plus className="w-4 h-4" />
                  Novo
                </button>
              )}
            </div>

            {loadingPeriods ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Carregando…</div>
            ) : periods.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Nenhum período encontrado
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {periods.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => setSelectedId(p.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                        selectedId === p.id
                          ? "bg-brand-primary/10"
                          : "hover:bg-muted/50"
                      }`}
                      aria-label={`Selecionar período ${fmtDate(p.startDate)} a ${fmtDate(p.endDate)}`}
                      aria-pressed={selectedId === p.id}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {fmtDate(p.startDate)} — {fmtDate(p.endDate)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {p._count.entries} worker{p._count.entries !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            p.status === "OPEN"
                              ? "bg-green-500/10 text-green-600"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {p.status === "OPEN" ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <Lock className="w-3 h-3" />
                          )}
                          {p.status === "OPEN" ? "Aberto" : "Fechado"}
                        </span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right — Period Detail */}
        <div className="lg:col-span-2">
          {!selectedId ? (
            <div className="bg-card border border-border rounded-2xl p-12 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
              <Calendar className="w-12 h-12 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground text-sm">
                Selecione um período para ver os detalhes
              </p>
            </div>
          ) : loadingDetail ? (
            <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground text-sm">
              Carregando…
            </div>
          ) : detail ? (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {/* Detail Header */}
              <div className="p-4 border-b border-border">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="font-semibold text-foreground">
                      {fmtDate(detail.startDate)} — {fmtDate(detail.endDate)}
                    </h2>
                    {detail.notes && (
                      <p className="text-sm text-muted-foreground mt-0.5">{detail.notes}</p>
                    )}
                    {detail.status === "CLOSED" && detail.closedBy && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Fechado por {detail.closedBy.nomeCompleto}
                        {detail.closedAt ? ` em ${fmtDate(detail.closedAt)}` : ""}
                      </p>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {detail.status === "OPEN" && (
                        <>
                          <button
                            onClick={handleCalculate}
                            disabled={calculating}
                            className="flex items-center gap-2 h-10 px-4 rounded-xl bg-brand-primary text-white text-sm font-medium disabled:opacity-50"
                            aria-label="Calcular entradas de payroll para este período"
                          >
                            <RefreshCw className={`w-4 h-4 ${calculating ? "animate-spin" : ""}`} />
                            {calculating ? "Calculando…" : "Calcular"}
                          </button>
                          <button
                            onClick={handleClose}
                            disabled={closing}
                            className="flex items-center gap-2 h-10 px-4 rounded-xl bg-destructive text-white text-sm font-medium disabled:opacity-50"
                            aria-label="Fechar este período de payroll"
                          >
                            <Lock className="w-4 h-4" />
                            {closing ? "Fechando…" : "Fechar Período"}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {calcResult && (
                  <p
                    className={`mt-3 text-sm px-3 py-2 rounded-xl ${
                      calcResult.startsWith("❌")
                        ? "bg-destructive/10 text-destructive"
                        : "bg-green-500/10 text-green-600"
                    }`}
                    role="status"
                    aria-live="polite"
                  >
                    {calcResult}
                  </p>
                )}
              </div>

              {/* Entries Table */}
              {detail.entries.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  Nenhuma entrada calculada. Clique em &quot;Calcular&quot; para processar os registros de ponto.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-4 py-3 text-muted-foreground font-medium">Worker</th>
                        <th className="text-right px-3 py-3 text-muted-foreground font-medium">
                          <span className="flex items-center justify-end gap-1">
                            <Clock className="w-3.5 h-3.5" /> Regular
                          </span>
                        </th>
                        <th className="text-right px-3 py-3 text-muted-foreground font-medium">OT</th>
                        <th className="text-right px-3 py-3 text-muted-foreground font-medium">Regular Pay</th>
                        <th className="text-right px-3 py-3 text-muted-foreground font-medium">OT Pay</th>
                        <th className="text-right px-3 py-3 text-muted-foreground font-medium">
                          <span className="flex items-center justify-end gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" /> Deduções
                          </span>
                        </th>
                        <th className="text-right px-4 py-3 text-muted-foreground font-medium">Gross Pay</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.entries.map((entry) => (
                        <tr
                          key={entry.id}
                          className="border-b border-border last:border-0 hover:bg-muted/20"
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-foreground">{entry.worker.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {usd(entry.hourlyRate)}/hr · {entry.worker.classification}
                            </p>
                          </td>
                          <td className="px-3 py-3 text-right text-foreground">
                            {fmtMinutes(entry.regularMinutes)}
                          </td>
                          <td className="px-3 py-3 text-right text-foreground">
                            {entry.overtimeMinutes > 0 ? (
                              <span className="text-yellow-600 font-medium">
                                {fmtMinutes(entry.overtimeMinutes)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right text-foreground">
                            {usd(entry.regularPay)}
                          </td>
                          <td className="px-3 py-3 text-right text-foreground">
                            {Number(entry.overtimePay) > 0 ? usd(entry.overtimePay) : "—"}
                          </td>
                          <td className="px-3 py-3 text-right">
                            {Number(entry.penaltyDeductions) > 0 ? (
                              <span className="text-destructive font-medium">
                                -{usd(entry.penaltyDeductions)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-foreground">
                            {usd(entry.grossPay)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/30 border-t border-border">
                        <td
                          colSpan={6}
                          className="px-4 py-3 text-right text-sm font-semibold text-foreground"
                        >
                          Total Gross Pay
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-foreground text-base">
                          {usd(detail.entries.reduce((a, e) => a + Number(e.grossPay), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </>
  )
}
