'use client'

import React, { useState } from 'react'
import type { EstimadorResult } from './types'

interface EstimadorPreviewProps {
  result: EstimadorResult
}

const formatUSD = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)

export function EstimadorPreview({ result }: EstimadorPreviewProps) {
  const [tab, setTab] = useState<'resumo' | 'etapas' | 'materiais'>('resumo')

  return (
    <div className="flex flex-col gap-4">
      {/* Cost range banner */}
      <div className="rounded-2xl bg-hero-gradient p-4 text-white">
        <p className="text-sm opacity-80 mb-1">Estimativa de custo — Dallas TX 2025</p>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold">{formatUSD(result.estimativaMedia)}</span>
          <span className="text-sm opacity-70 pb-1">médio</span>
        </div>
        <p className="text-xs opacity-70 mt-1">
          Faixa: {formatUSD(result.estimativaBaixa)} – {formatUSD(result.estimativaAlta)}
        </p>
        <div className="flex gap-4 mt-2 text-xs opacity-80">
          <span>Mão de obra: {formatUSD(result.custoMO)}</span>
          <span>Materiais: {formatUSD(result.custoMaterial)}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(['resumo', 'etapas', 'materiais'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t ? 'border-brand-primary text-brand-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'resumo' ? 'Resumo' : t === 'etapas' ? `Etapas (${result.etapas.length})` : `Materiais (${result.materiais.length})`}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'resumo' && (
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{result.escopoTexto}</p>
        </div>
      )}

      {tab === 'etapas' && (
        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
          {result.etapas.map((e, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/40 border border-border">
              <div className="w-6 h-6 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{e.servico}</p>
                {e.descricao && <p className="text-xs text-muted-foreground mt-0.5">{e.descricao}</p>}
              </div>
              {e.custoMO !== undefined && e.custoMO > 0 && (
                <span className="text-xs font-semibold text-brand-primary shrink-0">{formatUSD(e.custoMO)}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'materiais' && (
        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
          {result.materiais.map((m, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{m.nome}</p>
                {m.obs && <p className="text-xs text-muted-foreground">{m.obs}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground">{m.quantidade} {m.unidade}</p>
                {m.preco > 0 && (
                  <p className="text-xs font-semibold text-brand-primary">{formatUSD(m.preco)}/un</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        ⚠️ Estimativa baseada em médias para Dallas TX. Valores finais dependem de inspeção local.
      </p>
    </div>
  )
}
