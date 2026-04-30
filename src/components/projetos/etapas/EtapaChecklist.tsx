'use client'

import { useState, useCallback } from 'react'
import { CheckCircle2, Circle, Plus, Trash2, ClipboardList } from 'lucide-react'
import { Button } from '@gladpros/ui/button'
import { Input } from '@gladpros/ui/input'

export type ChecklistItem = {
  id: string
  texto: string
  concluido: boolean
}

type Props = {
  etapaId: number
  projetoId: number
  itensIniciais?: ChecklistItem[]
  readOnly?: boolean
}

function gerarId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function EtapaChecklist({ etapaId, projetoId, itensIniciais = [], readOnly = false }: Props) {
  const [itens, setItens] = useState<ChecklistItem[]>(itensIniciais)
  const [novoTexto, setNovoTexto] = useState('')
  const [salvando, setSalvando] = useState(false)

  const concluidos = itens.filter((i) => i.concluido).length
  const total = itens.length
  const progresso = total > 0 ? Math.round((concluidos / total) * 100) : 0

  const salvar = useCallback(async (novosItens: ChecklistItem[]) => {
    setSalvando(true)
    try {
      await fetch(`/api/projetos/${projetoId}/etapas/${etapaId}/checklist`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itens: novosItens }),
      })
    } finally {
      setSalvando(false)
    }
  }, [etapaId, projetoId])

  const toggleItem = useCallback((id: string) => {
    const novos = itens.map((item) =>
      item.id === id ? { ...item, concluido: !item.concluido } : item
    )
    setItens(novos)
    salvar(novos)
  }, [itens, salvar])

  const adicionarItem = useCallback(() => {
    const texto = novoTexto.trim()
    if (!texto) return
    const novos = [...itens, { id: gerarId(), texto, concluido: false }]
    setItens(novos)
    setNovoTexto('')
    salvar(novos)
  }, [novoTexto, itens, salvar])

  const removerItem = useCallback((id: string) => {
    const novos = itens.filter((item) => item.id !== id)
    setItens(novos)
    salvar(novos)
  }, [itens, salvar])

  return (
    <div className="space-y-3">
      {/* Header com progresso */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ClipboardList className="h-4 w-4" />
          <span>
            {concluidos}/{total} concluídos
          </span>
          {salvando && <span className="text-xs text-muted-foreground">(salvando…)</span>}
        </div>
        <span className="text-sm font-medium text-foreground">{progresso}%</span>
      </div>

      {/* Barra de progresso */}
      {total > 0 && (
        <div className="h-1.5 w-full rounded-full bg-muted">
          <div
            className="h-1.5 rounded-full bg-brand-primary transition-all duration-300"
            style={{ width: `${progresso}%` }}
          />
        </div>
      )}

      {/* Lista de itens */}
      <ul className="space-y-1.5">
        {itens.map((item) => (
          <li key={item.id} className="group flex items-center gap-2 rounded-lg p-1.5 hover:bg-muted/50">
            <button
              type="button"
              onClick={() => !readOnly && toggleItem(item.id)}
              disabled={readOnly}
              className="shrink-0 text-muted-foreground transition-colors hover:text-brand-primary disabled:cursor-default"
              aria-label={item.concluido ? 'Marcar como não concluído' : 'Marcar como concluído'}
            >
              {item.concluido ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Circle className="h-4 w-4" />
              )}
            </button>
            <span
              className={`flex-1 text-sm ${item.concluido ? 'text-muted-foreground line-through' : 'text-foreground'}`}
            >
              {item.texto}
            </span>
            {!readOnly && (
              <button
                type="button"
                onClick={() => removerItem(item.id)}
                className="hidden shrink-0 text-muted-foreground transition-colors hover:text-destructive group-hover:block"
                aria-label="Remover item"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {/* Adicionar novo item */}
      {!readOnly && (
        <div className="flex gap-2">
          <Input
            value={novoTexto}
            onChange={(e) => setNovoTexto(e.target.value)}
            placeholder="Adicionar item de escopo..."
            className="h-8 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && adicionarItem()}
            maxLength={500}
            aria-label="Novo item de checklist"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={adicionarItem}
            disabled={!novoTexto.trim()}
            className="h-8 px-3"
            aria-label="Adicionar item"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      {total === 0 && (
        <p className="text-center text-xs text-muted-foreground py-2">
          Nenhum item de escopo. Adicione itens para acompanhar o progresso desta etapa.
        </p>
      )}
    </div>
  )
}
