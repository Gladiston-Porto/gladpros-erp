"use client"

import { useCallback, useEffect, useState } from "react"
import { Badge } from "@gladpros/ui/badge"
import { Button } from "@gladpros/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@gladpros/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@gladpros/ui/dialog"
import { Input } from "@gladpros/ui/input"
import { Label } from "@gladpros/ui/label"
import { PageHeader } from "@gladpros/ui/page-header"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@gladpros/ui/select"
import { useToast } from "@gladpros/ui/toast"
import { parseApiError } from "@/lib/api/parseApiError"
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Landmark,
} from "lucide-react"

// ── Types ────────────────────────────────────────────────────────────────────

interface QuarterlyEstimate {
  id: number | null
  quarter: string
  dueDate: string
  estimatedAmount: number
  paidAmount: number
  status: string
  daysUntilDue: number
  alertLevel: "none" | "info" | "warning" | "critical"
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v)

function statusIcon(status: string) {
  switch (status) {
    case "PAID":
      return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
    case "PARTIAL":
      return <Clock className="h-5 w-5 text-orange-500" />
    case "OVERDUE":
      return <AlertCircle className="h-5 w-5 text-destructive" />
    default:
      return <Calendar className="h-5 w-5 text-muted-foreground" />
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "PAID":
      return <Badge variant="default">Pago</Badge>
    case "PARTIAL":
      return <Badge variant="secondary">Parcial</Badge>
    case "OVERDUE":
      return <Badge variant="destructive">Atrasado</Badge>
    default:
      return <Badge variant="outline">Pendente</Badge>
  }
}

function alertBorder(level: string) {
  switch (level) {
    case "critical":
      return "border-destructive"
    case "warning":
      return "border-orange-400 dark:border-orange-700"
    case "info":
      return "border-blue-400 dark:border-blue-700"
    default:
      return ""
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function EstimatedTaxPage() {
  const toast = useToast()
  const [quarters, setQuarters] = useState<QuarterlyEstimate[]>([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())

  // Payment modal
  const [showPayment, setShowPayment] = useState(false)
  const [paymentQuarter, setPaymentQuarter] = useState<string>("Q1")
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0])
  const [paymentNotes, setPaymentNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/financeiro/estimated-tax?year=${year}`)
      if (!res.ok) throw new Error("Erro ao carregar")
      const json = await res.json()
      setQuarters(json.data || [])
    } catch {
      toast.error("Erro ao carregar impostos estimados")
    } finally {
      setLoading(false)
    }
  }, [year, toast])

  useEffect(() => { loadData() }, [loadData])

  const openPaymentModal = (quarter: string, currentPaid: number) => {
    setPaymentQuarter(quarter)
    setPaymentAmount(currentPaid > 0 ? String(currentPaid) : "")
    setPaymentDate(new Date().toISOString().split("T")[0])
    setPaymentNotes("")
    setFieldErrors({})
    setShowPayment(true)
  }

  const handlePayment = async () => {
    const amount = Number(paymentAmount)
    const localErrors: Record<string, string> = {}
    if (!paymentAmount.trim() || isNaN(amount) || amount < 0) {
      localErrors.paidAmount = "Informe um valor válido"
    }
    if (!paymentDate) {
      localErrors.paidDate = "Data é obrigatória"
    }
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors)
      toast.error(Object.values(localErrors)[0])
      return
    }
    setFieldErrors({})

    setSubmitting(true)
    try {
      const res = await fetch("/api/financeiro/estimated-tax", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taxYear: year,
          quarter: paymentQuarter,
          paidAmount: amount,
          paidDate: paymentDate,
          notas: paymentNotes || undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const { fieldErrors: serverErrors, firstMessage } = parseApiError(json, "Erro ao registrar pagamento")
        setFieldErrors(serverErrors)
        toast.error(firstMessage)
        return
      }
      toast.success(`Pagamento ${paymentQuarter} registrado!`)
      setShowPayment(false)
      loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro")
    } finally {
      setSubmitting(false)
    }
  }

  const totalEstimated = quarters.reduce((s, q) => s + q.estimatedAmount, 0)
  const totalPaid = quarters.reduce((s, q) => s + q.paidAmount, 0)
  const remaining = totalEstimated - totalPaid

  return (
    <div className="space-y-6">
      <PageHeader
        title="Impostos Estimados"
        description={`Acompanhamento trimestral — Ano fiscal ${year}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Financeiro", href: "/dashboard/financeiro" },
          { label: "Fiscal", href: "/dashboard/financeiro/fiscal" },
          { label: "Impostos Estimados" },
        ]}
        actions={
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027].map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Estimado</p>
            <p className="text-lg font-bold">{fmt(totalEstimated)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Pago</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">{fmt(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Restante</p>
            <p className={`text-lg font-bold ${remaining > 0 ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400"}`}>
              {fmt(remaining)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quarter Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quarters.map((q) => {
            const progress = q.estimatedAmount > 0 ? Math.min((q.paidAmount / q.estimatedAmount) * 100, 100) : 0
            return (
              <Card key={q.quarter} className={`rounded-2xl border-2 ${alertBorder(q.alertLevel)}`}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-3">
                    {statusIcon(q.status)}
                    <div>
                      <CardTitle className="text-lg">{q.quarter}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Vencimento: {new Date(q.dueDate).toLocaleDateString("en-US", {
                          month: "long", day: "numeric", year: "numeric", timeZone: "America/Chicago",
                        })}
                      </p>
                    </div>
                  </div>
                  {statusLabel(q.status)}
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Pago: {fmt(q.paidAmount)}</span>
                      <span>Meta: {fmt(q.estimatedAmount)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          q.status === "PAID" ? "bg-green-500" :
                          q.status === "OVERDUE" ? "bg-destructive/50" :
                          q.status === "PARTIAL" ? "bg-orange-500" : "bg-blue-500"
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Days info */}
                  {q.status !== "PAID" && (
                    <p className={`text-xs ${q.daysUntilDue < 0 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                      {q.daysUntilDue < 0
                        ? `${Math.abs(q.daysUntilDue)} dias atrasado`
                        : q.daysUntilDue === 0
                          ? "Vence hoje!"
                          : `${q.daysUntilDue} dias restantes`
                      }
                    </p>
                  )}

                  {/* Action */}
                  <Button
                    variant={q.status === "PAID" ? "outline" : "default"}
                    className="w-full"
                    onClick={() => openPaymentModal(q.quarter, q.paidAmount)}
                  >
                    <Landmark className="h-4 w-4 mr-2" />
                    {q.status === "PAID" ? "Atualizar Pagamento" : "Registrar Pagamento"}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Payment Dialog */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento — {paymentQuarter}/{year}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="pay-amount">Valor Pago (USD) <span className="text-destructive">*</span></Label>
              <Input
                id="pay-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={paymentAmount}
                onChange={(e) => {
                  setPaymentAmount(e.target.value)
                  if (fieldErrors.paidAmount) setFieldErrors((p) => { const n = { ...p }; delete n.paidAmount; return n })
                }}
                aria-invalid={!!fieldErrors.paidAmount}
              />
              {fieldErrors.paidAmount && <p className="mt-1 text-sm text-destructive">{fieldErrors.paidAmount}</p>}
            </div>
            <div>
              <Label htmlFor="pay-date">Data do Pagamento <span className="text-destructive">*</span></Label>
              <Input
                id="pay-date"
                type="date"
                value={paymentDate}
                onChange={(e) => {
                  setPaymentDate(e.target.value)
                  if (fieldErrors.paidDate) setFieldErrors((p) => { const n = { ...p }; delete n.paidDate; return n })
                }}
                aria-invalid={!!fieldErrors.paidDate}
              />
              {fieldErrors.paidDate && <p className="mt-1 text-sm text-destructive">{fieldErrors.paidDate}</p>}
            </div>
            <div>
              <Label htmlFor="pay-notes">Notas (opcional)</Label>
              <Input
                id="pay-notes"
                placeholder="Referência do pagamento"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayment(false)}>Cancelar</Button>
            <Button onClick={handlePayment} disabled={submitting}>
              {submitting ? "Salvando..." : "Confirmar Pagamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
