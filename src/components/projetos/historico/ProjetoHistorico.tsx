'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@gladpros/ui/card'
import { Badge } from '@gladpros/ui/badge'
import { Button } from '@gladpros/ui/button'
import { Loading } from '@gladpros/ui/loading'
import {
  History,
  AlertCircle,
  Plus,
  Trash2,
  RefreshCw,
  User,
  Package,
  CheckSquare,
  Paperclip,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

interface HistoricoEntry {
  id: number
  acao: string
  detalhes: unknown
  criadoEm: string
  Usuario?: {
    id: number
    nomeCompleto: string
    email: string
  }
}

interface PaginacaoInfo {
  paginaAtual: number
  porPagina: number
  totalItens: number
  totalPaginas: number
  temProxima: boolean
  temAnterior: boolean
}

interface HistoricoResponse {
  data: HistoricoEntry[]
  paginacao: PaginacaoInfo
}

const ACAO_CONFIG: Record<string, { label: string; icon: React.ReactNode; variant: string }> = {
  'projeto.status_alterado': {
    label: 'Status alterado',
    icon: <RefreshCw className="h-3.5 w-3.5" />,
    variant: 'info',
  },
  'projeto.responsavel_alterado': {
    label: 'Responsável alterado',
    icon: <User className="h-3.5 w-3.5" />,
    variant: 'secondary',
  },
  'etapa.criada': {
    label: 'Etapa criada',
    icon: <Plus className="h-3.5 w-3.5" />,
    variant: 'success',
  },
  'etapa.atualizada': {
    label: 'Etapa atualizada',
    icon: <RefreshCw className="h-3.5 w-3.5" />,
    variant: 'secondary',
  },
  'material.alocado': {
    label: 'Material alocado',
    icon: <Package className="h-3.5 w-3.5" />,
    variant: 'warning',
  },
  'material.devolvido': {
    label: 'Material devolvido',
    icon: <Package className="h-3.5 w-3.5" />,
    variant: 'secondary',
  },
  'tarefa.criada': {
    label: 'Tarefa criada',
    icon: <Plus className="h-3.5 w-3.5" />,
    variant: 'success',
  },
  'tarefa.concluida': {
    label: 'Tarefa concluída',
    icon: <CheckSquare className="h-3.5 w-3.5" />,
    variant: 'success',
  },
  'anexo.adicionado': {
    label: 'Anexo adicionado',
    icon: <Paperclip className="h-3.5 w-3.5" />,
    variant: 'secondary',
  },
  'anexo.removido': {
    label: 'Anexo removido',
    icon: <Trash2 className="h-3.5 w-3.5" />,
    variant: 'error',
  },
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
}

function formatDetalhes(detalhes: unknown): string | null {
  if (!detalhes) return null
  if (typeof detalhes === 'string') return detalhes
  if (typeof detalhes === 'object') {
    const d = detalhes as Record<string, unknown>
    if (d.statusAnterior && d.novoStatus) {
      return `${d.statusAnterior} → ${d.novoStatus}`
    }
    if (d.descricao && typeof d.descricao === 'string') return d.descricao
    if (d.nome && typeof d.nome === 'string') return d.nome
  }
  return null
}

interface Props {
  projetoId: number
}

export function ProjetoHistorico({ projetoId }: Props) {
  const [data, setData] = useState<HistoricoEntry[]>([])
  const [paginacao, setPaginacao] = useState<PaginacaoInfo | null>(null)
  const [pagina, setPagina] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHistorico = useCallback(async (page: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/projetos/${projetoId}/historico?pagina=${page}&limite=15`
      )
      if (!res.ok) throw new Error('Falha ao carregar histórico')
      const json: HistoricoResponse = await res.json()
      setData(json.data ?? [])
      setPaginacao(json.paginacao ?? null)
    } catch {
      setError('Não foi possível carregar o histórico.')
    } finally {
      setLoading(false)
    }
  }, [projetoId])

  useEffect(() => {
    fetchHistorico(pagina)
  }, [fetchHistorico, pagina])

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-brand-primary" />
            Histórico de Atividades
          </CardTitle>
          {paginacao && (
            <span className="text-xs text-muted-foreground">
              {paginacao.totalItens} eventos
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {loading && (
          <div className="flex justify-center py-12">
            <Loading />
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchHistorico(pagina)}
            >
              Tentar novamente
            </Button>
          </div>
        )}

        {!loading && !error && data.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <History className="h-10 w-10 opacity-30" />
            <p className="text-sm">Nenhum evento registrado ainda.</p>
          </div>
        )}

        {!loading && !error && data.length > 0 && (
          <div className="relative">
            {/* Timeline vertical line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-border" aria-hidden />

            <ol className="space-y-4" aria-label="Histórico de atividades do projeto">
              {data.map((entry) => {
                const config = ACAO_CONFIG[entry.acao] ?? {
                  label: entry.acao,
                  icon: <History className="h-3.5 w-3.5" />,
                  variant: 'secondary',
                }
                const detalhe = formatDetalhes(entry.detalhes)

                return (
                  <li key={entry.id} className="flex gap-4 relative">
                    {/* Timeline dot */}
                    <div
                      className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card border border-border shadow-sm"
                      aria-hidden
                    >
                      <span className="text-muted-foreground">{config.icon}</span>
                    </div>

                    <div className="flex-1 pt-1.5 pb-2">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge variant={config.variant as Parameters<typeof Badge>[0]['variant']}>
                          {config.label}
                        </Badge>
                        {entry.Usuario && (
                          <span className="text-xs text-muted-foreground">
                            por {entry.Usuario.nomeCompleto}
                          </span>
                        )}
                      </div>
                      {detalhe && (
                        <p className="text-sm text-foreground mb-1">{detalhe}</p>
                      )}
                      <time
                        dateTime={entry.criadoEm}
                        className="text-xs text-muted-foreground"
                      >
                        {formatDate(entry.criadoEm)}
                      </time>
                    </div>
                  </li>
                )
              })}
            </ol>

            {paginacao && paginacao.totalPaginas > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagina((p) => p - 1)}
                  disabled={!paginacao.temAnterior}
                  aria-label="Página anterior do histórico"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <span className="text-xs text-muted-foreground">
                  {paginacao.paginaAtual} / {paginacao.totalPaginas}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagina((p) => p + 1)}
                  disabled={!paginacao.temProxima}
                  aria-label="Próxima página do histórico"
                >
                  Próxima
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
