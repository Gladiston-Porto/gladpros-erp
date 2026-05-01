'use client'

import React, { useState } from 'react'
import type { EstimadorResult } from './types'

interface EstimadorPreviewProps {
  result: EstimadorResult
  onMarginChange?: (margin: number, applyOnImport: boolean) => void
}

const formatUSD = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)

export function EstimadorPreview({ result, onMarginChange }: EstimadorPreviewProps) {
  const [tab, setTab]             = useState<'resumo' | 'etapas' | 'materiais'>('resumo')
  const [margin, setMargin]       = useState(0)           // 0–50%
  const [applyOnImport, setApply] = useState(false)

  const withMargin = (v: number) => Math.round(v * (1 + margin / 100))
  const hasMargin  = margin > 0

  const notifyParent = (m: number, a: boolean) => {
    onMarginChange?.(m, a)
  }

  const handleMarginChange = (v: number) => {
    setMargin(v)
    notifyParent(v, applyOnImport)
  }

  const handleApplyChange = (v: boolean) => {
    setApply(v)
    notifyParent(margin, v)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Cost range banner */}
      <div className="rounded-2xl bg-hero-gradient p-4 text-white">
        <p className="text-sm opacity-80 mb-1">Estimativa de custo — Dallas TX 2025</p>

        {hasMargin ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold">{formatUSD(withMargin(result.estimativaMedia))}</span>
              <span className="text-sm opacity-70 pb-1">com margem ({margin}%)</span>
            </div>
            <p className="text-xs opacity-60 line-through">
              Sem margem: {formatUSD(result.estimativaMedia)}
            </p>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold">{formatUSD(result.estimativaMedia)}</span>
            <span className="text-sm opacity-70 pb-1">médio (custo)</span>
          </div>
        )}

        <p className="text-xs opacity-70 mt-1">
          Faixa: {formatUSD(hasMargin ? withMargin(result.estimativaBaixa) : result.estimativaBaixa)} – {formatUSD(hasMargin ? withMargin(result.estimativaAlta) : result.estimativaAlta)}
        </p>
        <div className="flex gap-4 mt-2 text-xs opacity-80">
          <span>Mão de obra: {formatUSD(result.custoMO)}</span>
          <span>Materiais: {formatUSD(result.custoMaterial)}</span>
        </div>
      </div>

      {/* Margin toggle */}
      <div className="rounded-xl border border-border bg-muted/30 p-3 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Margem de lucro</span>
          <span className="text-sm font-bold text-brand-primary">{margin}%</span>
        </div>

        <input
          type="range"
          min={0}
          max={50}
          step={5}
          value={margin}
          onChange={(e) => handleMarginChange(Number(e.target.value))}
          className="w-full accent-brand-primary cursor-pointer"
          aria-label="Margem de lucro em porcentagem"
        />

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0%</span>
          <span>10%</span>
          <span>25%</span>
          <span>40%</span>
          <span>50%</span>
        </div>

        {hasMargin && (
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-lg bg-muted/50 p-2">
              <p className="text-muted-foreground">Preço de venda</p>
              <p className="font-bold text-foreground text-sm">{formatUSD(withMargin(result.estimativaMedia))}</p>
            </div>
            <div className="rounded-lg bg-green-500/10 p-2">
              <p className="text-muted-foreground">Lucro estimado</p>
              <p className="font-bold text-green-600 text-sm">
                {formatUSD(withMargin(result.estimativaMedia) - result.estimativaMedia)}
              </p>
            </div>
          </div>
        )}

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={applyOnImport}
            onChange={(e) => handleApplyChange(e.target.checked)}
            className="w-4 h-4 accent-brand-primary"
            aria-label="Aplicar margem ao importar para a proposta"
          />
          <span className="text-xs text-muted-foreground">
            Aplicar margem ao importar para a proposta
            {applyOnImport && margin > 0 && (
              <span className="text-brand-primary font-medium ml-1">
                (+{margin}% = {formatUSD(withMargin(result.estimativaMedia))})
              </span>
            )}
          </span>
        </label>
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
          {result.notas && result.notas.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1">
              {result.notas.map((nota, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                  <span className="shrink-0 mt-0.5">ℹ️</span>
                  <span>{nota}</span>
                </li>
              ))}
            </ul>
          )}
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

