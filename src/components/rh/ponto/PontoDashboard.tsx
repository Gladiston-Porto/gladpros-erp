"use client"

// PontoDashboard — visão gerencial em tempo real para ADMIN/GERENTE
// Mostra todos os turnos ativos, quem está em overtime, quem não bateu ponto

import { useState, useEffect, useCallback } from "react"
import { Users, Clock, AlertTriangle, UserX, RefreshCw, CheckCircle } from "lucide-react"

interface User {
  id: number
  role: string
  empresaId: number
}

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

export default function PontoDashboard({ user }: { user: User }) {
  const [activeEntries, setActiveEntries] = useState<TimeEntryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  const fetchActive = useCallback(async () => {
    try {
      const res = await fetch("/api/rh/time-entries?status=OPEN&pageSize=50")
      const data: PaginatedResponse = await res.json()
      if (data.success) setActiveEntries(data.data)
    } finally {
      setLoading(false)
      setLastUpdate(new Date())
    }
  }, [])

  useEffect(() => {
    fetchActive()
    const interval = setInterval(fetchActive, 60000) // Atualiza a cada minuto
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

  const overtimeEntries = activeEntries.filter(e => getElapsed(e.clockIn).minutes > 480)
  const total = activeEntries.length

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-hero-gradient px-6 pt-8 pb-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-white" />
            <h1 className="font-title text-xl text-white font-bold">Ponto Eletrônico</h1>
          </div>
          <button
            onClick={fetchActive}
            aria-label="Atualizar"
            className="text-white/70 hover:text-white transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
        <p className="text-white/70 text-xs">
          Atualizado: {formatTime(lastUpdate.toISOString())}
        </p>
      </div>

      <div className="px-4 py-6 max-w-2xl mx-auto space-y-4">

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-card border border-border p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Users className="w-5 h-5 text-brand-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground">{total}</div>
            <div className="text-xs text-muted-foreground mt-1">Trabalhando</div>
          </div>

          <div className="rounded-2xl bg-card border border-border p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">{overtimeEntries.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Em extra</div>
          </div>

          <div className="rounded-2xl bg-card border border-border p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">{total - overtimeEntries.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Normal</div>
          </div>
        </div>

        {/* Lista de turnos ativos */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase px-1">
            Turnos Ativos ({total})
          </h2>

          {activeEntries.length === 0 ? (
            <div className="rounded-2xl bg-card border border-border p-8 text-center">
              <UserX className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum worker com turno aberto no momento</p>
            </div>
          ) : (
            activeEntries.map((entry) => {
              const elapsed = getElapsed(entry.clockIn)
              const overtime = elapsed.minutes > 480

              return (
                <div
                  key={entry.id}
                  className={`rounded-2xl p-4 border flex items-center justify-between ${
                    overtime
                      ? "bg-red-500/5 border-red-500/20"
                      : "bg-card border-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${overtime ? "bg-red-500 animate-pulse" : "bg-green-500 animate-pulse"}`} />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{entry.worker.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Entrada: {formatTime(entry.clockIn)} · {entry.workLocation}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${overtime ? "text-red-500" : "text-foreground"}`}>
                      {elapsed.display}
                    </p>
                    {overtime && (
                      <p className="text-xs text-red-400">
                        +{getElapsed(new Date(new Date(entry.clockIn).getTime() + 480 * 60000).toISOString()).display} extra
                      </p>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
