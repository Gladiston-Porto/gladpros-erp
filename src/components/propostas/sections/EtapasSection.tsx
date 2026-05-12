'use client'

import React from 'react'
import { Label, Input, Textarea, Select } from '../ui-components'
import { HoursInput } from '../HoursInput'
import { Etapa } from '../types'

interface EtapasSectionProps {
  etapas: Etapa[]
  onEtapasChange: (etapas: Etapa[]) => void
}

export function EtapasSection({ etapas, onEtapasChange }: EtapasSectionProps) {
  const addEtapa = () => {
    const novaEtapa: Etapa = {
      id: crypto.randomUUID(),
      servico: "",
      descricao: "",
      quantidade: 1,
      unidade: "serviço",
      status: "planejada"
    }
    onEtapasChange([...etapas, novaEtapa])
  }

  const removeEtapa = (id: string) => {
    onEtapasChange(etapas.filter(e => e.id !== id))
  }

  const updateEtapa = (id: string, updates: Partial<Etapa>) => {
    onEtapasChange(
      etapas.map(e => e.id === id ? { ...e, ...updates } : e)
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {etapas.map((etapa) => (
        <div key={etapa.id} className="grid grid-cols-12 gap-2 rounded-xl border border-border bg-muted p-3">
          <div className="col-span-3">
            <Label required>Serviço</Label>
            <Input 
              value={etapa.servico} 
              onChange={(e) => updateEtapa(etapa.id, { servico: e.target.value })} 
            />
          </div>
          <div className="col-span-5">
            <Label required>Descrição</Label>
            <Textarea 
              rows={3} 
              value={etapa.descricao} 
              onChange={(e) => updateEtapa(etapa.id, { descricao: e.target.value })} 
            />
          </div>
          <div className="col-span-1">
            <Label>Qtd</Label>
            <Input 
              type="number" 
              value={etapa.quantidade ?? ""} 
              onChange={(e) => updateEtapa(etapa.id, { quantidade: Number(e.target.value) })} 
            />
          </div>
          <div className="col-span-1">
            <Label>Un</Label>
            <Input 
              value={etapa.unidade ?? ""} 
              onChange={(e) => updateEtapa(etapa.id, { unidade: e.target.value })} 
            />
          </div>
          <div className="col-span-1">
            <Label>Horas (H:MM)</Label>
            <HoursInput
              value={etapa.duracaoHoras}
              onChange={(hours) => updateEtapa(etapa.id, { duracaoHoras: hours })}
              aria-label={`Duração de ${etapa.servico || 'etapa'}`}
            />
          </div>
          <div className="col-span-1">
            <Label>Custo MO</Label>
            <Input 
              type="number" 
              step="0.01" 
              value={etapa.custoMO ?? ""} 
              onChange={(e) => updateEtapa(etapa.id, { custoMO: Number(e.target.value) })} 
            />
          </div>
          <div className="col-span-12 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label>Status</Label>
              <Select 
                value={etapa.status} 
                onChange={(e) => updateEtapa(etapa.id, { status: e.target.value as "planejada" | "opcional" | "removida" })} 
                className="w-auto"
              >
                <option value="planejada">Planejada</option>
                <option value="opcional">Opcional</option>
                <option value="removida">Removida</option>
              </Select>
            </div>
            <button 
              onClick={() => removeEtapa(etapa.id)} 
              className="rounded-2xl border border-destructive/30 bg-background px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10"
              aria-label="Remover etapa"
            >
              Remover
            </button>
          </div>
        </div>
      ))}
      <div>
        <button 
          onClick={addEtapa} 
          className="rounded-xl bg-card px-4 py-2 text-sm font-medium text-brand-primary shadow-sm ring-1 ring-inset ring-border hover:bg-muted"
        >
          + Adicionar etapa
        </button>
      </div>
    </div>
  )
}
