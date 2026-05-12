'use client'

import React from 'react'
import { Badge, currency } from '../ui-components'
import { TotaisCalculados, InternoInfo } from '../types'
import { StatusProposta, StatusPropostaValues } from '@/shared/types/prisma-temp'
import { Label, Input } from '../ui-components'

interface ResumoPrecoSidebarProps {
  totais: TotaisCalculados
  interno: InternoInfo
  status: StatusProposta
  onInternoChange: (interno: InternoInfo) => void
  onStatusChange: (status: StatusProposta) => void
}

export function ResumoPrecoSidebar({
  totais,
  interno,
  status,
  onInternoChange,
  onStatusChange,
}: ResumoPrecoSidebarProps) {
  const statusBadgeColor = status === StatusPropostaValues.APROVADA ? 'green' : 'red'
  const statusLabel = status === StatusPropostaValues.RASCUNHO ? 'Rascunho'
    : status === StatusPropostaValues.APROVADA ? 'Aprovada' : 'Cancelada'

  return (
    <div className="order-1 flex flex-col gap-6 lg:order-2">
      {/* Resumo de Preço */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-start justify-between">
          <h3 className="text-base font-semibold text-foreground">Resumo de Preço (interno)</h3>
          <Badge>Privado</Badge>
        </div>
        <div className="space-y-3">
          {/* Materials breakdown */}
          {(totais.matEstoque > 0 || totais.matComprar > 0) ? (
            <>
              {totais.matEstoque > 0 && (
                <div className="grid grid-cols-2 text-sm">
                  <span className="text-muted-foreground pl-2 border-l-2 border-green-500/40">📦 Mat. em estoque</span>
                  <span className="text-right font-medium text-green-600">{currency(totais.matEstoque)}</span>
                </div>
              )}
              {totais.matComprar > 0 && (
                <div className="grid grid-cols-2 text-sm">
                  <span className="text-muted-foreground pl-2 border-l-2 border-brand-secondary/40">🛒 Mat. a comprar</span>
                  <span className="text-right font-medium">{currency(totais.matComprar)}</span>
                </div>
              )}
              {totais.salesTax > 0 && (
                <div className="grid grid-cols-2 text-sm">
                  <span className="text-muted-foreground pl-2 border-l-2 border-brand-secondary/40 text-brand-secondary">Sales Tax (8.25%)</span>
                  <span className="text-right font-medium text-brand-secondary">+{currency(totais.salesTax)}</span>
                </div>
              )}
              <div className="grid grid-cols-2 text-sm">
                <span className="text-muted-foreground font-medium">Materiais (total)</span>
                <span className="text-right font-medium">{currency(totais.mat)}</span>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 text-sm">
              <span className="text-muted-foreground">Materiais</span>
              <span className="text-right font-medium">{currency(totais.mat)}</span>
            </div>
          )}
          <div className="grid grid-cols-2 text-sm">
            <span className="text-muted-foreground">Mão de obra</span>
            <span className="text-right font-medium">{currency(totais.mo)}</span>
          </div>
          <div className="grid grid-cols-2 text-sm">
            <span className="text-muted-foreground">Terceiros</span>
            <span className="text-right font-medium">{currency(totais.terce)}</span>
          </div>
          <div className="grid grid-cols-2 text-sm">
            <span className="text-muted-foreground">Frete/Logística</span>
            <span className="text-right font-medium">{currency(totais.frete)}</span>
          </div>
          <hr className="my-2 border-border" />
          <div className="grid grid-cols-2 text-sm">
            <span className="text-muted-foreground">Overhead</span>
            <span className="text-right font-medium">{currency(totais.overhead)}</span>
          </div>
          <div className="grid grid-cols-2 text-sm">
            <span className="text-muted-foreground">Margem</span>
            <span className="text-right font-medium">{currency(totais.margem)}</span>
          </div>
          <div className="grid grid-cols-2 text-sm">
            <span className="text-muted-foreground">Contingência</span>
            <span className="text-right font-medium">{currency(totais.conting)}</span>
          </div>
          <div className="grid grid-cols-2 text-sm">
            <span className="text-muted-foreground">Impostos</span>
            <span className="text-right font-medium">{currency(totais.impostos)}</span>
          </div>
          <div className="mt-3 rounded-xl bg-muted p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-foreground">Preço ao cliente (estimado)</span>
              <span className="text-base font-semibold text-foreground">{currency(totais.precoCliente)}</span>
            </div>
          </div>
        </div>

        {/* Controles de cálculo */}
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div>
            <Label>Overhead (%)</Label>
            <Input type="number" value={interno.overhead_pct} onChange={(e) => onInternoChange({ ...interno, overhead_pct: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Margem (%)</Label>
            <Input type="number" value={interno.margem_pct} onChange={(e) => onInternoChange({ ...interno, margem_pct: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Impostos (%)</Label>
            <Input type="number" value={interno.impostos_pct} onChange={(e) => onInternoChange({ ...interno, impostos_pct: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Contingência (%)</Label>
            <Input type="number" value={interno.contingencia_pct} onChange={(e) => onInternoChange({ ...interno, contingencia_pct: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Custo materiais</Label>
            <Input type="number" step="0.01" value={interno.custo_material} onChange={(e) => onInternoChange({ ...interno, custo_material: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Custo mão de obra</Label>
            <Input type="number" step="0.01" value={interno.custo_mo} onChange={(e) => onInternoChange({ ...interno, custo_mo: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Horas MO</Label>
            <Input type="number" value={interno.horas_mo} onChange={(e) => onInternoChange({ ...interno, horas_mo: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Terceiros</Label>
            <Input type="number" step="0.01" value={interno.custo_terceiros} onChange={(e) => onInternoChange({ ...interno, custo_terceiros: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Frete/Log</Label>
            <Input type="number" step="0.01" value={interno.frete} onChange={(e) => onInternoChange({ ...interno, frete: Number(e.target.value) })} />
          </div>
        </div>
      </section>

      {/* Status da Proposta */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Status da Proposta</h3>
            <p className="mt-1 text-sm text-muted-foreground">Controle o estado atual da proposta.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Status atual: <Badge color={statusBadgeColor}>{statusLabel}</Badge>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onStatusChange(StatusPropostaValues.APROVADA)}
                aria-label="Marcar proposta como aprovada"
                className="rounded-xl border border-green-500/30 bg-background px-3 py-2 text-xs font-semibold text-green-600 hover:bg-green-500/10 min-h-[48px]"
              >
                Marcar aprovada
              </button>
              <button
                onClick={() => onStatusChange(StatusPropostaValues.CANCELADA)}
                aria-label="Cancelar proposta"
                className="rounded-xl border border-destructive/30 bg-background px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 min-h-[48px]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
