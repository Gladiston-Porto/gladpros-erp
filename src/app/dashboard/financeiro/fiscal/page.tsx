"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Badge } from "@gladpros/ui/badge"
import { Button } from "@gladpros/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@gladpros/ui/card"
import { PageHeader } from "@gladpros/ui/page-header"
import {
  AlertCircle,
  ArrowRight,
  Calculator,
  DollarSign,
  FileText,
  Landmark,
  TrendingUp,
} from "lucide-react"

// ── Types ────────────────────────────────────────────────────────────────────

interface ScheduleCLineItem {
  lineNumber: string
  lineName: string
  total: number
}

interface TaxSummary {
  grossRevenue: number
  totalDeductibleExpenses: number
  netIncome: number
  ownerSalaryYTD: number
  selfEmploymentTax: number
  estimatedIncomeTax: number
  totalEstimatedTax: number
  quarterlyPaymentTarget: number
  expensesByScheduleCLine: ScheduleCLineItem[]
}

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

interface FiscalAlert {
  id: string
  type: string
  severity: "info" | "warning" | "critical"
  title: string
  message: string
  actionUrl?: string
  quarter?: string
}

interface DashboardData {
  taxSummary: TaxSummary
  quarterlyEstimates: QuarterlyEstimate[]
  alerts: FiscalAlert[]
  year: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v)

function alertColor(severity: string) {
  switch (severity) {
    case "critical":
      return "bg-destructive/5 border-destructive/30 text-destructive dark:bg-destructive/10 dark:border-destructive/50 dark:text-destructive"
    case "warning":
      return "bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-950/30 dark:border-orange-800 dark:text-orange-300"
    default:
      return "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300"
  }
}

function quarterStatusBadge(status: string) {
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

// ── Component ────────────────────────────────────────────────────────────────

export default function FiscalDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/financeiro/tax/dashboard")
      if (!res.ok) throw new Error("Erro ao carregar dashboard fiscal")
      const json = await res.json()
      setData(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Painel Fiscal"
          description="Carregando..."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Financeiro", href: "/dashboard/financeiro" },
            { label: "Painel Fiscal" },
          ]}
        />
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Painel Fiscal"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Financeiro", href: "/dashboard/financeiro" },
            { label: "Painel Fiscal" },
          ]}
        />
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive font-semibold">{error || "Erro desconhecido"}</p>
            <Button onClick={loadData} className="mt-4" variant="secondary">Tentar novamente</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { taxSummary: ts, quarterlyEstimates, alerts } = data

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel Fiscal"
        description={`Visão consolidada de impostos — Ano fiscal ${data.year}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Financeiro", href: "/dashboard/financeiro" },
          { label: "Painel Fiscal" },
        ]}
        actions={
          <div className="flex gap-3">
            <Link href="/dashboard/financeiro/fiscal/compensacao">
              <Button variant="outline" size="lg">
                <DollarSign className="h-4 w-4" />
                Compensação
              </Button>
            </Link>
            <Link href="/dashboard/financeiro/fiscal/impostos-estimados">
              <Button variant="outline" size="lg">
                <Calculator className="h-4 w-4" />
                Impostos Estimados
              </Button>
            </Link>
            <Link href="/dashboard/financeiro/fiscal/relatorios">
              <Button size="lg">
                <FileText className="h-4 w-4" />
                Relatórios
              </Button>
            </Link>
          </div>
        }
      />

      {/* Fiscal Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start gap-3 p-3 border rounded-2xl ${alertColor(alert.severity)}`}
            >
              <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-sm">{alert.title}</p>
                <p className="text-sm opacity-80">{alert.message}</p>
              </div>
              {alert.actionUrl && (
                <Link href={alert.actionUrl} className="text-sm font-medium underline shrink-0">
                  Ver
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-green-100 dark:bg-green-950/40 p-2">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Receita Bruta YTD</p>
                <p className="text-lg font-bold">{fmt(ts.grossRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-100 dark:bg-blue-950/40 p-2">
                <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lucro Líquido YTD</p>
                <p className="text-lg font-bold">{fmt(ts.netIncome)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-orange-100 dark:bg-orange-950/40 p-2">
                <Landmark className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Imposto Estimado Total</p>
                <p className="text-lg font-bold">{fmt(ts.totalEstimatedTax)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-purple-100 dark:bg-purple-950/40 p-2">
                <Calculator className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Meta Trimestral</p>
                <p className="text-lg font-bold">{fmt(ts.quarterlyPaymentTarget)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quarterly Estimated Tax */}
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Landmark className="h-5 w-5" />
              Impostos Estimados Trimestrais
            </CardTitle>
            <Link href="/dashboard/financeiro/fiscal/impostos-estimados">
              <Button variant="ghost" size="sm">
                Gerenciar <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {quarterlyEstimates.map((q) => (
                <div
                  key={q.quarter}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
                >
                  <div>
                    <p className="font-medium text-sm">{q.quarter}</p>
                    <p className="text-xs text-muted-foreground">
                      Vencimento: {new Date(q.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Chicago" })}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium">{fmt(q.paidAmount)} / {fmt(q.estimatedAmount)}</p>
                    </div>
                    {quarterStatusBadge(q.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Schedule C Preview */}
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5" />
              Schedule C — Resumo
            </CardTitle>
            <Link href="/dashboard/financeiro/fiscal/categorias">
              <Button variant="ghost" size="sm">
                Categorias <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {ts.expensesByScheduleCLine.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">
                Nenhuma despesa dedutível registrada
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {ts.expensesByScheduleCLine
                  .sort((a, b) => a.lineNumber.localeCompare(b.lineNumber))
                  .map((line) => (
                    <div
                      key={line.lineNumber}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                          {line.lineNumber}
                        </span>
                        <span className="text-sm">{line.lineName}</span>
                      </div>
                      <span className="text-sm font-medium">{fmt(line.total)}</span>
                    </div>
                  ))}
                <div className="flex items-center justify-between p-2 border-t font-semibold text-sm">
                  <span>Total Despesas Dedutíveis</span>
                  <span>{fmt(ts.totalDeductibleExpenses)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tax Breakdown */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-5 w-5" />
            Detalhamento de Impostos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-muted/50">
              <p className="text-xs text-muted-foreground">Self-Employment Tax</p>
              <p className="text-lg font-bold">{fmt(ts.selfEmploymentTax)}</p>
              <p className="text-xs text-muted-foreground mt-1">15.3% sobre 92.35% do lucro líquido</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/50">
              <p className="text-xs text-muted-foreground">Income Tax (estimado)</p>
              <p className="text-lg font-bold">{fmt(ts.estimatedIncomeTax)}</p>
              <p className="text-xs text-muted-foreground mt-1">Federal brackets 2026</p>
            </div>
            {ts.ownerSalaryYTD > 0 && (
              <div className="p-4 rounded-xl bg-muted/50">
                <p className="text-xs text-muted-foreground">Owner Salary YTD (S-Corp)</p>
                <p className="text-lg font-bold">{fmt(ts.ownerSalaryYTD)}</p>
                <p className="text-xs text-muted-foreground mt-1">Reduz base tributável</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
