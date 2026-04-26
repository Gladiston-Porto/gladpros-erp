"use client";

import { useState, useEffect, useCallback } from "react";
import { ModulePageHeader } from "@gladpros/ui/module-page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@gladpros/ui/card";
import { Badge } from "@gladpros/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Receipt,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

type Period = "weekly" | "monthly" | "annual";
type MarginStatus = "OK" | "WARNING" | "ALERT" | "CRITICAL" | "LOSS";

interface FinancialSummary {
  period: Period;
  rangeStart: string;
  rangeEnd: string;
  osCount: number;
  osWithPriceCount: number;
  totalRevenue: number;
  totalCost: number;
  grossMargin: number;
  grossMarginPct: number;
  avgMarginPct: number;
  marginStatusBreakdown: Record<MarginStatus, number>;
  invoiceCount: number;
  invoiceTotal: number;
  invoicePaid: number;
  invoicePending: number;
  collectionRate: number;
}

interface JobOverBudget {
  id: number;
  orderNumber: string;
  title: string;
  status: string;
  marginStatus: MarginStatus;
  clientName: string;
  agreedClientPrice: number;
  totalCost: number;
  grossMargin: number;
  marginPct: number;
  overage: number;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

const pct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

const marginBadge: Record<MarginStatus, { label: string; className: string }> = {
  OK: { label: "OK", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  WARNING: { label: "Warning", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  ALERT: { label: "Alert", className: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  CRITICAL: { label: "Critical", className: "bg-red-500/10 text-red-600 border-red-500/20" },
  LOSS: { label: "Loss ⚠", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

export default function FinanceiroExecutivoDashboard() {
  const [period, setPeriod] = useState<Period>("monthly");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [jobsOverBudget, setJobsOverBudget] = useState<JobOverBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ period, year: String(year) });
      if (period === "monthly") params.set("month", String(month));

      const [summaryRes, jobsRes] = await Promise.all([
        fetch(`/api/reports/financial-summary?${params}`),
        fetch(`/api/reports/jobs-over-budget?pageSize=5&minStatus=CRITICAL`),
      ]);

      const [summaryJson, jobsJson] = await Promise.all([
        summaryRes.json(),
        jobsRes.json(),
      ]);

      if (summaryJson.success) setSummary(summaryJson.data);
      if (jobsJson.success) setJobsOverBudget(jobsJson.data ?? []);
    } catch {
      setError("Erro ao carregar dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [period, year, month]);

  useEffect(() => { load(); }, [load]);

  const marginColor = (pctVal: number) => {
    if (pctVal < 0) return "text-destructive";
    if (pctVal < 10) return "text-red-500";
    if (pctVal < 20) return "text-yellow-500";
    return "text-green-500";
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return (
    <div className="space-y-6">
      <ModulePageHeader
        title="Financial Executive Dashboard"
        description="P&L per job, collection rate, and margin health"
        icon={<BarChart3 />}
        accentColor="#0098DA"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Relatórios", href: "/relatorios" },
          { label: "Financeiro Executivo" },
        ]}
      />

      {/* Period Selector */}
      <div className="flex flex-wrap gap-2 items-center">
        {(["monthly", "annual"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            aria-label={`Período: ${p}`}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors min-h-[36px] ${
              period === p
                ? "bg-brand-primary text-white"
                : "bg-card border border-border text-muted-foreground hover:border-brand-primary/40"
            }`}
          >
            {p === "monthly" ? "Monthly" : "Annual"}
          </button>
        ))}
        {period === "monthly" && (
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            aria-label="Month"
            className="px-3 py-1.5 rounded-xl text-sm bg-card border border-border text-foreground min-h-[36px]"
          >
            {months.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
        )}
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          aria-label="Year"
          className="px-3 py-1.5 rounded-xl text-sm bg-card border border-border text-foreground min-h-[36px]"
        >
          {[2023, 2024, 2025, 2026].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <button
          onClick={load}
          aria-label="Refresh"
          className="px-3 py-1.5 rounded-xl text-sm bg-brand-primary text-white min-h-[36px]"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : summary ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="rounded-2xl border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <DollarSign className="w-4 h-4" />
                  Total Revenue
                </div>
                <p className="text-2xl font-bold text-foreground">{fmt(summary.totalRevenue)}</p>
                <p className="text-xs text-muted-foreground mt-1">{summary.osWithPriceCount} jobs with price</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <TrendingDown className="w-4 h-4" />
                  Total Cost
                </div>
                <p className="text-2xl font-bold text-foreground">{fmt(summary.totalCost)}</p>
                <p className="text-xs text-muted-foreground mt-1">Labor + Materials</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <TrendingUp className="w-4 h-4" />
                  Gross Margin
                </div>
                <p className={`text-2xl font-bold ${marginColor(summary.grossMarginPct)}`}>
                  {fmt(summary.grossMargin)}
                </p>
                <p className={`text-xs mt-1 font-semibold ${marginColor(summary.grossMarginPct)}`}>
                  {pct(summary.grossMarginPct)}
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Receipt className="w-4 h-4" />
                  Collection Rate
                </div>
                <p className="text-2xl font-bold text-foreground">{summary.collectionRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {fmt(summary.invoicePaid)} of {fmt(summary.invoiceTotal)}
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Receipt className="w-4 h-4" />
                  Invoiced
                </div>
                <p className="text-2xl font-bold text-foreground">{fmt(summary.invoiceTotal)}</p>
                <p className="text-xs text-muted-foreground mt-1">{summary.invoiceCount} invoices</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  Pending Payment
                </div>
                <p className={`text-2xl font-bold ${summary.invoicePending > 0 ? "text-yellow-500" : "text-green-500"}`}>
                  {fmt(summary.invoicePending)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Unpaid invoices</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Healthy Jobs
                </div>
                <p className="text-2xl font-bold text-green-500">
                  {(summary.marginStatusBreakdown.OK ?? 0) + (summary.marginStatusBreakdown.WARNING ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">OK + Warning margin</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <XCircle className="w-4 h-4 text-destructive" />
                  At-Risk Jobs
                </div>
                <p className={`text-2xl font-bold ${
                  ((summary.marginStatusBreakdown.CRITICAL ?? 0) + (summary.marginStatusBreakdown.LOSS ?? 0)) > 0
                    ? "text-destructive"
                    : "text-foreground"
                }`}>
                  {(summary.marginStatusBreakdown.CRITICAL ?? 0) + (summary.marginStatusBreakdown.LOSS ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Critical + Loss</p>
              </CardContent>
            </Card>
          </div>

          {/* Margin Status Breakdown */}
          <Card className="rounded-2xl border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Margin Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex flex-wrap gap-3">
                {(["OK", "WARNING", "ALERT", "CRITICAL", "LOSS"] as MarginStatus[]).map((status) => {
                  const count = summary.marginStatusBreakdown[status] ?? 0;
                  const { label, className } = marginBadge[status];
                  return (
                    <div key={status} className="flex items-center gap-2">
                      <Badge className={`${className} border text-xs`}>{label}</Badge>
                      <span className="text-sm font-semibold text-foreground">{count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Jobs Over Budget */}
          {jobsOverBudget.length > 0 && (
            <Card className="rounded-2xl border-border">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  Jobs Over Budget (Critical / Loss)
                </CardTitle>
                <Link
                  href="/relatorios/jobs-over-budget"
                  className="text-xs text-brand-primary hover:underline flex items-center gap-1"
                  aria-label="View all jobs over budget"
                >
                  View all <ChevronRight className="w-3 h-3" />
                </Link>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                {jobsOverBudget.map((job) => {
                  const { label, className } = marginBadge[job.marginStatus];
                  return (
                    <Link
                      key={job.id}
                      href={`/ordens-servico/${job.id}`}
                      aria-label={`View OS ${job.orderNumber}`}
                      className="flex items-center justify-between p-3 rounded-xl border border-border hover:border-brand-primary/40 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge className={`${className} border text-xs`}>{label}</Badge>
                          <span className="text-xs font-mono text-muted-foreground">{job.orderNumber}</span>
                        </div>
                        <p className="text-sm font-medium text-foreground mt-1 truncate max-w-xs">{job.title}</p>
                        <p className="text-xs text-muted-foreground">{job.clientName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-destructive">{fmt(job.grossMargin)}</p>
                        <p className="text-xs text-muted-foreground">{job.marginPct.toFixed(1)}% margin</p>
                        {job.overage > 0 && (
                          <p className="text-xs text-destructive font-medium">+{fmt(job.overage)} over</p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {jobsOverBudget.length === 0 && (
            <Card className="rounded-2xl border-border">
              <CardContent className="p-8 text-center">
                <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">No critical or loss-margin jobs</p>
                <p className="text-xs text-muted-foreground mt-1">All jobs are within healthy margin ranges</p>
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}
