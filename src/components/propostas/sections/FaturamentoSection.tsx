'use client'

import React from 'react'
import { Section, Label, Input, Textarea, Select } from '../ui-components'

interface FaturamentoInfo {
  gatilho: "na_aprovacao" | "por_marcos" | "na_entrega" | "custom"
  percentual_sinal: number
  forma_preferida: string
  instrucoes: string
}

interface FaturamentoSectionProps {
  faturamento: FaturamentoInfo
  onChange: (faturamento: FaturamentoInfo) => void
  isLoading?: boolean
}

export function FaturamentoSection({ 
  faturamento, 
  onChange, 
  isLoading = false 
}: FaturamentoSectionProps) {
  const handleFieldChange = (field: keyof FaturamentoInfo) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const value = field === 'percentual_sinal' ? Number(e.target.value) : e.target.value
    onChange({
      ...faturamento,
      [field]: value
    })
  }

  const getGatilhoLabel = (gatilho: string) => {
    const labels = {
      na_aprovacao: "Na aprovação da proposta",
      por_marcos: "Por marcos do projeto",
      na_entrega: "Na entrega final",
      custom: "Personalizado"
    }
    return labels[gatilho as keyof typeof labels] || "Selecione..."
  }

  return (
    <Section 
      title="Faturamento e Cobrança" 
      subtitle="Configure como e quando o faturamento será realizado"
    >
      <div className="grid grid-cols-1 gap-6">
        {/* Gatilho de Faturamento */}
        <div>
          <Label required>Quando iniciar o faturamento</Label>
          <Select
            value={faturamento.gatilho}
            onChange={handleFieldChange('gatilho')}
            disabled={isLoading}
          >
            <option value="na_aprovacao">Na aprovação da proposta</option>
            <option value="por_marcos">Por marcos do projeto</option>
            <option value="na_entrega">Na entrega final</option>
            <option value="custom">Personalizado</option>
          </Select>
          <p className="mt-2 text-xs text-muted-foreground">
            Define quando começar a cobrar do cliente
          </p>
        </div>

        {/* Percentual de Sinal */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Sinal/Entrada (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              placeholder="30"
              value={faturamento.percentual_sinal || ''}
              onChange={handleFieldChange('percentual_sinal')}
              disabled={isLoading}
            />
          </div>
          <div className="flex items-end">
            <div className="text-sm text-muted-foreground bg-muted px-3 py-2.5 rounded-xl border">
              {faturamento.percentual_sinal ? `${100 - faturamento.percentual_sinal}%` : '70%'} restante
            </div>
          </div>
        </div>

        {/* Forma Preferida */}
        <div>
          <Label>Forma de Pagamento Preferida</Label>
          <Input
            placeholder="Ex: Check, Credit Card, ACH Transfer, Cash"
            value={faturamento.forma_preferida || ''}
            onChange={handleFieldChange('forma_preferida')}
            disabled={isLoading}
          />
        </div>

        {/* Instruções de Faturamento */}
        <div>
          <Label>Instruções Especiais de Faturamento</Label>
          <Textarea
            rows={4}
            placeholder="Instruções específicas sobre faturamento, prazos de pagamento, dados para NF, etc."
            value={faturamento.instrucoes || ''}
            onChange={handleFieldChange('instrucoes')}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Resumo do Faturamento */}
      <div className="mt-6 rounded-xl bg-muted p-4 border border-border">
        <h4 className="text-sm font-medium text-muted-foreground mb-3">📋 Resumo do Faturamento</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Gatilho:</span>
            <div className="font-medium text-muted-foreground">
              {getGatilhoLabel(faturamento.gatilho)}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Divisão de pagamento:</span>
            <div className="font-medium text-muted-foreground">
              {faturamento.percentual_sinal}% entrada + {100 - (faturamento.percentual_sinal || 0)}% restante
            </div>
          </div>
          {faturamento.forma_preferida && (
            <div className="md:col-span-2">
              <span className="text-muted-foreground">Forma preferida:</span>
              <div className="font-medium text-muted-foreground">{faturamento.forma_preferida}</div>
            </div>
          )}
        </div>
      </div>

      {/* Dicas por tipo de gatilho */}
      {faturamento.gatilho === 'por_marcos' && (
        <div className="mt-4 rounded-xl bg-brand-primary/10 p-4 border border-brand-primary/30">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-brand-primary mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-sm text-brand-primary">
              <p className="font-medium">Faturamento por marcos</p>
              <p className="mt-1">
                Certifique-se de definir marcos claros nas etapas do projeto. Cada marco pode ter um percentual específico de cobrança.
              </p>
            </div>
          </div>
        </div>
      )}

      {faturamento.percentual_sinal > 50 && (
        <div className="mt-4 rounded-xl bg-yellow-500/10 p-4 border border-yellow-500/30">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-sm text-yellow-600">
              <p className="font-medium">Entrada alta</p>
              <p className="mt-1">
                Uma entrada superior a 50% pode ser vista como agressiva pelo cliente. Considere justificar essa condição.
              </p>
            </div>
          </div>
        </div>
      )}
    </Section>
  )
}
