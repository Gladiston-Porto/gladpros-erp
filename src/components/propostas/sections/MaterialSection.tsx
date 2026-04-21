'use client'

import React from 'react'
import { Label, Input } from '../ui-components'
import { Material } from '../types'

interface MaterialSectionProps {
  materiais: Material[]
  onMateriaisChange: (materiais: Material[]) => void
}

export function MaterialSection({ materiais, onMateriaisChange }: MaterialSectionProps) {
  const addMaterial = () => {
    const novoMaterial: Material = {
      id: crypto.randomUUID(),
      codigo: "",
      nome: "",
      quantidade: 1,
      unidade: "un",
      status: "necessario"
    }
    onMateriaisChange([...materiais, novoMaterial])
  }

  const removeMaterial = (id: string) => {
    onMateriaisChange(materiais.filter(m => m.id !== id))
  }

  const updateMaterial = (id: string, updates: Partial<Material>) => {
    onMateriaisChange(
      materiais.map(m => m.id === id ? { ...m, ...updates } : m)
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {materiais.map((material) => (
        <div key={material.id} className="grid grid-cols-12 items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="col-span-2">
            <Label required>Código</Label>
            <Input 
              value={material.codigo} 
              onChange={(e) => updateMaterial(material.id, { codigo: e.target.value })} 
            />
          </div>
          <div className="col-span-3">
            <Label required>Nome</Label>
            <Input 
              value={material.nome} 
              onChange={(e) => updateMaterial(material.id, { nome: e.target.value })} 
            />
          </div>
          <div className="col-span-2">
            <Label required>Quantidade</Label>
            <Input 
              type="number" 
              value={material.quantidade} 
              onChange={(e) => updateMaterial(material.id, { quantidade: Number(e.target.value) })} 
            />
          </div>
          <div className="col-span-1">
            <Label required>Un</Label>
            <Input 
              value={material.unidade} 
              onChange={(e) => updateMaterial(material.id, { unidade: e.target.value })} 
            />
          </div>
          <div className="col-span-2">
            <Label>Preço unit. (interno)</Label>
            <Input 
              type="number" 
              step="0.01" 
              value={material.preco ?? ""} 
              onChange={(e) => updateMaterial(material.id, { preco: Number(e.target.value) })} 
            />
          </div>
          <div className="col-span-2 flex items-end justify-end gap-2">
            <button 
              onClick={() => removeMaterial(material.id)} 
              className="rounded-2xl border border-destructive/30 bg-background px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10"
              aria-label="Remover material"
            >
              Remover
            </button>
          </div>
        </div>
      ))}
      <div>
        <button 
          onClick={addMaterial} 
          className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-[var(--gp-blue)] shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
        >
          + Adicionar material
        </button>
      </div>
    </div>
  )
}
