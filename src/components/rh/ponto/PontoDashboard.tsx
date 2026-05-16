"use client"

// PontoDashboard — visão gerencial em tempo real para ADMIN/GERENTE
// Abas: Ativos | Pendentes | Infrações

import { useState, useEffect, useCallback } from "react"
import { Users, AlertTriangle, UserX, RefreshCw, CheckCircle, ClipboardCheck } from "lucide-react"
import PontoApprovalQueue from "./PontoApprovalQueue"
import PontoInfractions from "./PontoInfractions"

type Tab = "ativos" | "pendentes" | "infracoes"

interface TimeEntryItem {
  id: number
  clockIn: string
  workLocation: string
  status: string
  worker: {
    id: number
    name: string
    type: string
    compensationModel: string
  }
}

interface PaginatedResponse {
  data: TimeEntryItem[]
  pagination: { total: number }
  success: boolean
}

export default function PontoDashboard({ user: _user }: { user: { id: number; role: string; empresaId: number } }) {
  const [activeTab, setActiveTab] = useState<Tab>("ativos")
  const [activeEntries, setActiveEntries] = useState<TimeEntryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)

  const fetchActive = useCallback(async () => {
    try {
      const [activeRes, pendingRes] = await Promise.all([
        fetch("/api/rh/time-entries?status=OPEN&pageSize=50"),
        fetch("/api/rh/time-entries?status=SUBMITTED,AUTO_CLOSED,CORRECTION_PENDING&pageSize=1"),
      ])
      const activeData: PaginatedResponse = await activeRes.json()
      const pendingData: PaginatedResponse = await pendingRes.json()
      if (activeData.success) setActiveEntries(activeData.data)
      if (pendingData.success) setPendingCount(pendingData.pagination.total)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchActive()
    const interval = setInterval(fetchActive, 60000)
    return () => clearInterval(interval)
  }, [fetchActive])

  const getElapsed = (clockIn: string) => {
    const minutes = Math.round((Date.now() - new Date(clockIn).getTime()) / 60000)
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return { minutes, display: h > 0 ? `${h}h ${m}min` : `${m}min` }
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", {
      timeZone: "America/Chicago",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })

  const overtimeEntries = activeEntries.filter((e) => getElapsed(e.clockIn).minutes > 480)
  const total = activeEntries.length

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: "ativos",
      label: "Ativos",
      icon: <Users className="w-3.5 h-3.5" />,
      badge: total > 0 ? total : undefined,
    },
    {
      id: "pendentes",
      label: "Pendentes",
      icon: <ClipboardCheck className="w-3.5 h-3.5" />,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    {
      id: "infracoes",
      label: "Infrações",
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    },
  ]

  return (
    <div className="bg-background border-t border-border">
      {/* Section header */}
      <div className="px-6 py-4 bg-card border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-brand-primary" />
          <h2 className="font-semibold text-sm text-foreground">Painel da Equipe</h2>
        </div>
        <button
          onClick={fetchActive}
          aria-label="Atualizar painel"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-card">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            aria-label={`Aba ${tab.label}`}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium transition-colors relative ${
              activeTab === tab.id
                ? "text-brand-primary border-b-2 border-brand-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.badge !== undefined && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-brand-primary text-white text-[10px] font-bold min-w-[18px] text-center">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-4 py-4 max-w-2xl mx-auto">
        {activeTab === "ativos" && (
          <div className="space-y-4">
            {/* Stats */}
            {!loading && (
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-card border border-border p-4 text-center">
                  <Users className="w-5 h-5 text-brand-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">{total}</div>
                  <div className="text-xs text-muted-foreground mt-1">Trabalhando</div>
                </div>
                <div className="rounded-2xl bg-card border border-border p-4 text-center">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">{overtimeEntries.length}</div>
                  <div className="text-xs text-muted-foreground mt-1">Em extra</div>
                </div>
                <div className="rounded-2xl bg-card border border-border p-4 text-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">
                    {total - overtimeEntries.length}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Normal</div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-primary border-t-transparent" />
              </div>
            ) : activeEntries.length === 0 ? (
              <div className="rounded-2xl bg-card border border-border p-8 text-center">
                <UserX className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum worker com turno aberto no momento</p>
              </div>
            ) : (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase px-1">
                  Turnos Ativos ({total})
                </h3>
                {activeEntries.map((entry) => {
                  const elapsed = getElapsed(entry.clockIn)
                  const overtime = elapsed.minutes > 480
                  return (
                    <div
                      key={entry.id}
                      className={`rounded-2xl p-4 border flex items-center justify-between ${
                        overtime ? "bg-red-500/5 border-red-500/20" : "bg-card border-border"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full shrink-0 animate-pulse ${
                            overtime ? "bg-red-500" : "bg-green-500"
                          }`}
                        />
                        <div>
                          <p className="text-sm font-semibold text-foreground">{entry.worker.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Entrada: {formatTime(entry.clockIn)} · {entry.workLocation}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-bold ${overtime ? "text-red-500" : "text-foreground"}`}
                        >
                          {elapsed.display}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "pendentes" && <PontoApprovalQueue />}
        {activeTab === "infracoes" && <PontoInfractions />}
      </div>
    </div>
  )
}
