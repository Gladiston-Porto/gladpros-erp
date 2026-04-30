'use client'

import { useEffect, useState } from 'react'
import { CalendarDays, AlertCircle, Loader2 } from 'lucide-react'

type Etapa = {
  id: number
  servico: string
  status: string
  porcentagem: number
  inicioPrevisto: string | null
  fimPrevisto: string | null
  inicioReal: string | null
  fimReal: string | null
}

type Props = {
  projetoId: number
}

const STATUS_COLOR: Record<string, string> = {
  pendente: 'bg-muted-foreground/40',
  em_andamento: 'bg-brand-primary',
  em_validacao: 'bg-yellow-500',
  concluida: 'bg-green-500',
  bloqueada: 'bg-destructive',
  cancelada: 'bg-muted-foreground/20',
}

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  em_validacao: 'Em validação',
  concluida: 'Concluída',
  bloqueada: 'Bloqueada',
  cancelada: 'Cancelada',
}

function calcDayOffset(date: Date, start: Date): number {
  const ms = date.getTime() - start.getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

function getDurationDays(start: Date, end: Date): number {
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  return Math.max(days, 1)
}

export function GanttView({ projetoId }: Props) {
  const [etapas, setEtapas] = useState<Etapa[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/projetos/${projetoId}/etapas`)
      .then((r) => r.json())
      .then((json) => {
        const lista: Etapa[] = Array.isArray(json.data) ? json.data : (json.etapas ?? [])
        setEtapas(lista)
      })
      .catch(() => setErro('Falha ao carregar etapas'))
      .finally(() => setLoading(false))
  }, [projetoId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        Carregando cronograma…
      </div>
    )
  }

  if (erro) {
    return (
      <div className="flex items-center gap-2 text-destructive py-8">
        <AlertCircle className="h-5 w-5" />
        {erro}
      </div>
    )
  }

  // Filtra etapas com pelo menos uma data prevista
  const etapasComData = etapas.filter(
    (e) => e.inicioPrevisto || e.inicioReal || e.fimPrevisto || e.fimReal
  )

  if (etapasComData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
        <CalendarDays className="h-10 w-10 opacity-40" />
        <p className="text-sm">
          Nenhuma etapa com data prevista. Edite as etapas e defina datas para visualizar o cronograma.
        </p>
      </div>
    )
  }

  // Determina o intervalo global
  const toDate = (s: string | null) => (s ? new Date(s) : null)
  const allDates = etapasComData.flatMap((e) => [
    toDate(e.inicioPrevisto),
    toDate(e.fimPrevisto),
    toDate(e.inicioReal),
    toDate(e.fimReal),
  ]).filter(Boolean) as Date[]

  const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())))
  const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())))
  const totalDays = getDurationDays(minDate, maxDate)
  const today = new Date()
  const todayOffset = calcDayOffset(today, minDate)
  const todayVisible = todayOffset >= 0 && todayOffset <= totalDays

  // Define largura mínima de dia em pixels
  const DAY_PX = Math.max(24, Math.min(48, Math.floor(900 / totalDays)))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CalendarDays className="h-4 w-4" />
        <span>{etapasComData.length} etapa(s) no cronograma</span>
        <span className="ml-auto text-xs">
          {minDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Chicago' })}
          {' → '}
          {maxDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Chicago' })}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <div style={{ minWidth: `${DAY_PX * totalDays + 200}px` }}>
          {/* Header com meses */}
          <GanttHeader minDate={minDate} totalDays={totalDays} dayPx={DAY_PX} />

          {/* Linhas das etapas */}
          <div className="relative divide-y divide-border">
            {/* Marcador de hoje */}
            {todayVisible && (
              <div
                className="absolute top-0 bottom-0 w-px bg-brand-secondary/70 z-10 pointer-events-none"
                style={{ left: `${200 + todayOffset * DAY_PX}px` }}
                title="Hoje"
              />
            )}

            {etapasComData.map((etapa) => {
              const start = toDate(etapa.inicioReal ?? etapa.inicioPrevisto)
              const end = toDate(etapa.fimReal ?? etapa.fimPrevisto)
              if (!start || !end) return null

              const offset = calcDayOffset(start, minDate)
              const duration = getDurationDays(start, end)
              const color = STATUS_COLOR[etapa.status] ?? STATUS_COLOR.pendente
              const progresso = Math.min(100, Math.max(0, etapa.porcentagem))

              return (
                <div key={etapa.id} className="flex items-center h-12 hover:bg-muted/30 transition-colors">
                  {/* Nome da etapa */}
                  <div className="w-[200px] shrink-0 px-3 text-sm font-medium text-foreground truncate">
                    {etapa.servico}
                  </div>

                  {/* Barra Gantt */}
                  <div className="relative flex-1 h-full py-3" style={{ paddingLeft: `${offset * DAY_PX}px` }}>
                    <div
                      className={`relative h-6 rounded-full ${color} flex items-center overflow-hidden`}
                      style={{ width: `${duration * DAY_PX}px`, minWidth: '8px' }}
                      title={`${STATUS_LABEL[etapa.status] ?? etapa.status} — ${progresso}%`}
                    >
                      {/* Barra de progresso interno */}
                      {progresso > 0 && (
                        <div
                          className="absolute left-0 top-0 bottom-0 bg-black/20 rounded-full"
                          style={{ width: `${progresso}%` }}
                        />
                      )}
                      {/* Label dentro da barra (se larga o suficiente) */}
                      {duration * DAY_PX > 60 && (
                        <span className="relative z-10 truncate px-2 text-xs font-medium text-white">
                          {etapa.servico}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* % à direita */}
                  <div className="w-12 shrink-0 text-right pr-3 text-xs text-muted-foreground">
                    {progresso}%
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {Object.entries(STATUS_LABEL).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`h-3 w-6 rounded-full ${STATUS_COLOR[key]}`} />
            {label}
          </div>
        ))}
        {todayVisible && (
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-px bg-brand-secondary" />
            Hoje
          </div>
        )}
      </div>
    </div>
  )
}

function GanttHeader({
  minDate,
  totalDays,
  dayPx,
}: {
  minDate: Date
  totalDays: number
  dayPx: number
}) {
  // Gera marcadores mensais
  const months: Array<{ label: string; offset: number; width: number }> = []
  let cursor = new Date(minDate)
  cursor.setDate(1)
  if (cursor < minDate) cursor.setMonth(cursor.getMonth() + 1)

  for (let i = 0; i < 36; i++) {
    const offset = calcDayOffset(cursor, minDate)
    if (offset > totalDays) break
    const nextMonth = new Date(cursor)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    const end = nextMonth > new Date(minDate.getTime() + totalDays * 86400000)
      ? new Date(minDate.getTime() + totalDays * 86400000)
      : nextMonth
    const width = getDurationDays(cursor, end)
    months.push({
      label: cursor.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'America/Chicago' }),
      offset: Math.max(0, offset),
      width,
    })
    cursor = nextMonth
  }

  return (
    <div className="flex h-8 bg-muted/50 border-b border-border sticky top-0 z-20">
      {/* Coluna de nome */}
      <div className="w-[200px] shrink-0 px-3 flex items-center text-xs font-semibold text-muted-foreground border-r border-border">
        Etapa
      </div>
      {/* Meses */}
      <div className="relative flex-1 overflow-hidden">
        {months.map((m, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 flex items-center border-r border-border/50 px-2"
            style={{ left: `${m.offset * dayPx}px`, width: `${m.width * dayPx}px` }}
          >
            <span className="truncate text-xs text-muted-foreground">{m.label}</span>
          </div>
        ))}
      </div>
      {/* % col */}
      <div className="w-12 shrink-0" />
    </div>
  )
}
