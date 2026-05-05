'use client'

import { useEffect, useState } from 'react'
import { Eye, Clock, Monitor } from 'lucide-react'

interface ViewEntry {
  id: number
  viewedAt: string
  ip: string
  device: string
}

interface ViewData {
  visualizacoes: number
  primeiraVisualizacaoEm: string | null
  ultimaVisualizacaoEm: string | null
  views: ViewEntry[]
}

interface VisualizacoesPanelProps {
  propostaId: number
}

const TZ = 'America/Chicago'

function fmtDT(iso: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(iso))
}

export function VisualizacoesPanel({ propostaId }: VisualizacoesPanelProps) {
  const [data, setData] = useState<ViewData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/propostas/${propostaId}/views`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setData(res.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [propostaId])

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 text-brand-primary" />
        <h3 className="text-sm font-semibold text-foreground">Visualizações do cliente</h3>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
          <Clock className="h-3 w-3" />
          Carregando...
        </div>
      ) : !data || data.visualizacoes === 0 ? (
        <p className="text-sm text-muted-foreground">O cliente ainda não abriu a proposta.</p>
      ) : (
        <>
          {/* Summary row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-brand-primary/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-brand-primary">{data.visualizacoes}</p>
              <p className="text-xs text-muted-foreground mt-0.5">visualizações</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <p className="text-xs font-medium text-foreground leading-tight">{fmtDT(data.primeiraVisualizacaoEm)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">primeira abertura</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <p className="text-xs font-medium text-foreground leading-tight">{fmtDT(data.ultimaVisualizacaoEm)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">última abertura</p>
            </div>
          </div>

          {/* History table */}
          {data.views.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Histórico</p>
              <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                {data.views.map((v) => (
                  <div key={v.id} className="flex items-center justify-between px-3 py-2 text-xs bg-background">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Monitor className="h-3 w-3 shrink-0" />
                      <span>{v.device}</span>
                      <span className="text-border">·</span>
                      <span className="font-mono">{v.ip}</span>
                    </div>
                    <span className="text-foreground">{fmtDT(v.viewedAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
