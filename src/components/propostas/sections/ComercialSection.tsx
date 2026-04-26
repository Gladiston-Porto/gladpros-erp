'use client'

import React from 'react'
import { Section, Label, Input, Textarea, Button } from '../ui-components'
import { ComercialInfo } from '../types'

interface ComercialSectionProps {
  comercial: ComercialInfo
  onChange: (comercial: ComercialInfo) => void
  isLoading?: boolean
}

export function ComercialSection({ 
  comercial, 
  onChange, 
  isLoading = false 
}: ComercialSectionProps) {
  const handleFieldChange = (field: keyof ComercialInfo) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    onChange({
      ...comercial,
      [field]: e.target.value
    })
  }

  const handleNumberFieldChange = (field: keyof ComercialInfo) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value === '' ? 0 : Number(e.target.value)
    onChange({
      ...comercial,
      [field]: value
    })
  }

  const addCondicoesPagamento = () => {
    onChange({
      ...comercial,
      condicoes_pagamento: [...comercial.condicoes_pagamento, '']
    })
  }

  const updateCondicoesPagamento = (index: number, value: string) => {
    const newCondicoes = [...comercial.condicoes_pagamento]
    newCondicoes[index] = value
    onChange({
      ...comercial,
      condicoes_pagamento: newCondicoes
    })
  }

  const removeCondicoesPagamento = (index: number) => {
    const newCondicoes = comercial.condicoes_pagamento.filter((_: string, i: number) => i !== index)
    onChange({
      ...comercial,
      condicoes_pagamento: newCondicoes
    })
  }

  return (
    <Section 
      title="Informações Comerciais" 
      subtitle="Defina valores, condições e detalhes comerciais da proposta"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Valor da Proposta */}
        <div>
          <Label required>Valor da Proposta ($)</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={comercial.valor_proposta || ''}
            onChange={handleNumberFieldChange('valor_proposta')}
            disabled={isLoading}
          />
        </div>

        {/* Prazo de Validade */}
        <div>
          <Label required>Validade da Proposta (dias)</Label>
          <Input
            type="number"
            placeholder="30"
            value={comercial.prazo_validade || ''}
            onChange={handleNumberFieldChange('prazo_validade')}
            disabled={isLoading}
          />
        </div>

        {/* Local de Execução */}
        <div className="md:col-span-2">
          <Label required>Local de Execução</Label>
          <Input
            placeholder="Endereço completo onde será executado o serviço"
            value={comercial.local_execucao || ''}
            onChange={handleFieldChange('local_execucao')}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Condições de Pagamento */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <Label>Condições de Pagamento</Label>
          <Button
            onClick={addCondicoesPagamento}
            disabled={isLoading}
            className="text-xs"
          >
            + Adicionar condição
          </Button>
        </div>
        
        {comercial.condicoes_pagamento.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhuma condição de pagamento definida. Clique em &quot;Adicionar condição&quot; para começar.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {comercial.condicoes_pagamento.map((condicao: string, index: number) => (
              <div key={index} className="flex gap-3 items-center">
                <div className="flex-1">
                  <Input
                    placeholder={`${index + 1}ª parcela - ex: 30% na assinatura do contrato`}
                    value={condicao}
                    onChange={(e) => updateCondicoesPagamento(index, e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <Button
                  onClick={() => removeCondicoesPagamento(index)}
                  disabled={isLoading}
                  className="bg-rose-50 text-rose-600 hover:bg-rose-100"
                >
                  Remover
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Observações Comerciais */}
      <div className="mt-6">
        <Label>Observações Comerciais</Label>
        <Textarea
          rows={4}
          placeholder="Informações adicionais, descontos especiais, condições especiais, etc."
          value={comercial.observacoes || ''}
          onChange={handleFieldChange('observacoes')}
          disabled={isLoading}
        />
      </div>

      {/* Garantias */}
      <div className="mt-6">
        <Label>Garantias Oferecidas</Label>
        <Textarea
          rows={3}
          placeholder="Ex: 12 meses de garantia para materiais, 6 meses para mão de obra"
          value={comercial.garantias || ''}
          onChange={handleFieldChange('garantias')}
          disabled={isLoading}
        />
      </div>
    </Section>
  )
}
