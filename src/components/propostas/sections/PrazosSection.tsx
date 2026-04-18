'use client'

import React from 'react'
import { Label, Input, Textarea } from '../ui-components'
import { PrazosInfo } from '../types'

interface PrazosSectionProps {
  prazos: PrazosInfo
  onPrazosChange: (prazos: PrazosInfo) => void
}

export function PrazosSection({ prazos, onPrazosChange }: PrazosSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <div>
        <Label required>Tempo para aceite (dias)</Label>
        <Input 
          type="number" 
          value={prazos.tempo_para_aceite} 
          onChange={(e) => onPrazosChange({ ...prazos, tempo_para_aceite: Number(e.target.value) })} 
        />
      </div>
      <div>
        <Label required>Validade da proposta</Label>
        <Input 
          type="date" 
          value={prazos.validade_proposta} 
          onChange={(e) => onPrazosChange({ ...prazos, validade_proposta: e.target.value })} 
        />
      </div>
      <div>
        <Label required>Prazo de execução (dias)</Label>
        <Input 
          type="number" 
          value={prazos.prazo_execucao_dias} 
          onChange={(e) => onPrazosChange({ ...prazos, prazo_execucao_dias: Number(e.target.value) })} 
        />
      </div>
      <div>
        <Label>Janela preferencial</Label>
        <Input 
          placeholder="Seg‑Sex, 8h–17h" 
          value={prazos.janela || ''} 
          onChange={(e) => onPrazosChange({ ...prazos, janela: e.target.value })} 
        />
      </div>
      <div className="md:col-span-4">
        <Label>Restrições de acesso</Label>
        <Textarea 
          placeholder="Ex.: cadastro de visitantes, carga/descarga até 16h…" 
          value={prazos.restricoes || ''} 
          onChange={(e) => onPrazosChange({ ...prazos, restricoes: e.target.value })} 
        />
      </div>
    </div>
  )
}
