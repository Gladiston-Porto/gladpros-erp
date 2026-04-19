"use client"

import { useState } from "react"
import { Badge } from "@gladpros/ui/badge"
import { Button } from "@gladpros/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@gladpros/ui/card"
import { PageHeader } from "@gladpros/ui/page-header"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@gladpros/ui/select"
import { useToast } from "@gladpros/ui/toast"
import {
  Download,
  FileSpreadsheet,
  FileText,
  DollarSign,
  Users,
  Calculator,
  BarChart3,
} from "lucide-react"

// ── Types ────────────────────────────────────────────────────────────────────

type ReportFormat = "excel" | "pdf"

interface ReportConfig {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  endpoint: string
  formats: ReportFormat[]
  params?: Record<string, string>
}

// ── Component ────────────────────────────────────────────────────────────────

export default function FiscalReportsPage() {
  const toast = useToast()
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(String(currentYear))
  const [period, setPeriod] = useState<"annual" | "quarterly" | "monthly">("quarterly")
  const [downloading, setDownloading] = useState<string | null>(null)

  const reports: ReportConfig[] = [
    {
      id: "schedule-c",
      title: "Schedule C",
      description: "Relatório completo do Schedule C (Form 1040) com todas as categorias de despesas mapeadas por linha do IRS.",
      icon: FileText,
      endpoint: "/api/financeiro/reports/schedule-c",
      formats: ["excel", "pdf"],
    },
    {
      id: "pnl",
      title: "Profit & Loss (P&L)",
      description: "Demonstrativo de resultado com receitas e despesas organizadas por categoria, alinhado ao Schedule C.",
      icon: BarChart3,
      endpoint: "/api/financeiro/reports/pnl",
      formats: ["excel", "pdf"],
    },
    {
      id: "owner-compensation",
      title: "Owner Compensation",
      description: "Resumo de toda compensação do owner (draws, salário, distribuições) no período selecionado.",
      icon: DollarSign,
      endpoint: "/api/financeiro/reports/owner-compensation",
      formats: ["excel"],
    },
    {
      id: "1099-summary",
      title: "1099-NEC Summary",
      description: "Resumo de pagamentos a contractors para preparação dos formulários 1099-NEC.",
      icon: Users,
      endpoint: "/api/financeiro/reports/1099-summary",
      formats: ["excel"],
    },
    {
      id: "quarterly-comparison",
      title: "Quarterly Tax Comparison",
      description: "Comparativo entre imposto estimado e efetivamente pago por trimestre.",
      icon: Calculator,
      endpoint: "/api/financeiro/reports/quarterly-comparison",
      formats: ["excel"],
    },
  ]

  const download = async (report: ReportConfig, format: ReportFormat) => {
    const key = `${report.id}-${format}`
    setDownloading(key)

    try {
      const params = new URLSearchParams({ year, format })
      if (report.id === "pnl") {
        params.set("period", period)
      }

      const res = await fetch(`${report.endpoint}?${params.toString()}`)

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Download failed" }))
        throw new Error(errorData.error || "Erro no download")
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = getFilename(report.id, format, year, period)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success(`${report.title} (${format.toUpperCase()}) baixado!`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao baixar relatório")
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios Fiscais"
        description="Exporte relatórios para o contador — Schedule C, P&L, 1099, compensação"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Financeiro", href: "/dashboard/financeiro" },
          { label: "Fiscal", href: "/dashboard/financeiro/fiscal" },
          { label: "Relatórios" },
        ]}
      />

      {/* Filters */}
      <Card className="rounded-2xl">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="report-year" className="text-sm font-medium">Ano Fiscal:</label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger id="report-year" className="w-28" aria-label="Ano fiscal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="report-period" className="text-sm font-medium">Período P&L:</label>
              <Select value={period} onValueChange={(v) => setPeriod(v as "annual" | "quarterly" | "monthly")}>
                <SelectTrigger id="report-period" className="w-36" aria-label="Período do P&L">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Anual</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Badge variant="outline" className="text-xs">
              DRAFT — For CPA review
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((report) => (
          <Card key={report.id} className="rounded-2xl flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <report.icon className="h-5 w-5 text-[#0098DA]" />
                {report.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4">
              <p className="text-sm text-muted-foreground flex-1">
                {report.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {report.formats.includes("excel") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => download(report, "excel")}
                    disabled={downloading === `${report.id}-excel`}
                    className="gap-1.5"
                    aria-label={`Download ${report.title} Excel`}
                  >
                    <FileSpreadsheet className="h-4 w-4 text-green-600" />
                    {downloading === `${report.id}-excel` ? "Gerando..." : "Excel"}
                  </Button>
                )}
                {report.formats.includes("pdf") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => download(report, "pdf")}
                    disabled={downloading === `${report.id}-pdf`}
                    className="gap-1.5"
                    aria-label={`Download ${report.title} PDF`}
                  >
                    <Download className="h-4 w-4 text-destructive" />
                    {downloading === `${report.id}-pdf` ? "Gerando..." : "PDF"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Help note */}
      <Card className="rounded-2xl border-dashed">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Nota para o contador:</strong> Todos os relatórios são gerados como DRAFT (rascunho). 
            Os valores refletem as transações registradas no sistema até a data de geração. 
            Revise com seu CPA antes de submeter ao IRS. 
            Moeda: USD. Timezone: America/Chicago.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getFilename(reportId: string, format: ReportFormat, year: string, period: string): string {
  const ext = format === "excel" ? "xlsx" : "pdf"
  const base = reportId === "pnl" ? `pnl-${year}-${period}` : `${reportId}-${year}`
  return `${base}.${ext}`
}
