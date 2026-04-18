'use client'

import React from 'react'
import { Section, Label, Textarea } from '../ui-components'

interface ObservacoesInfo {
  obs_cliente?: string
  obs_internas?: string
}

interface ObservacoesSectionProps {
  observacoes: ObservacoesInfo
  onChange: (observacoes: ObservacoesInfo) => void
  isLoading?: boolean
}

export function ObservacoesSection({ 
  observacoes, 
  onChange, 
  isLoading = false 
}: ObservacoesSectionProps) {
  const handleFieldChange = (field: keyof ObservacoesInfo) => (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    onChange({
      ...observacoes,
      [field]: e.target.value
    })
  }

  return (
    <Section 
      title="Observações" 
      subtitle="Adicione informações complementares para o cliente e anotações internas"
    >
      <div className="grid grid-cols-1 gap-6">
        {/* Observações para o Cliente */}
        <div>
          <Label>Observações para o Cliente</Label>
          <Textarea
            rows={4}
            placeholder="Informações que aparecerão na proposta para o cliente (condições especiais, restrições, etc.)"
            value={observacoes.obs_cliente || ''}
            onChange={handleFieldChange('obs_cliente')}
            disabled={isLoading}
          />
          <p className="mt-2 text-xs text-slate-500">
            💡 Essas observações serão visíveis ao cliente na proposta final
          </p>
        </div>

        {/* Observações Internas */}
        <div>
          <Label>Observações Internas (Privadas)</Label>
          <Textarea
            rows={4}
            placeholder="Anotações internas sobre o projeto, considerações técnicas, alertas para a equipe, etc."
            value={observacoes.obs_internas || ''}
            onChange={handleFieldChange('obs_internas')}
            disabled={isLoading}
          />
          <p className="mt-2 text-xs text-slate-500">
            🔒 Essas observações são privadas e não aparecerão na proposta do cliente
          </p>
        </div>
      </div>

      {/* Dicas */}
      <div className="mt-6 rounded-xl bg-slate-50 p-4 border border-slate-200">
        <h4 className="text-sm font-medium text-slate-800 mb-2">💡 Dicas para boas observações:</h4>
        <ul className="text-xs text-slate-600 space-y-1">
          <li>• <strong>Para o cliente:</strong> Mencione prazos especiais, condições de acesso, requisitos de segurança</li>
          <li>• <strong>Internas:</strong> Anote riscos identificados, fornecedores específicos, questões técnicas</li>
          <li>• Seja claro e objetivo nas informações</li>
          <li>• Use as observações internas para registrar detalhes importantes para a execução</li>
        </ul>
      </div>
    </Section>
  )
}
