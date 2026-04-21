'use client'

import React from 'react'
import { Section, Label, Textarea, Select } from '../ui-components'
import { StatusPermite, StatusPermiteValues } from '@/shared/types/prisma-temp'

interface PermiteInfo {
  status: StatusPermite
  quais_permites?: string
  normas?: string
  inspecoes?: string
}

interface PermitsSectionProps {
  permite: PermiteInfo
  onChange: (permite: PermiteInfo) => void
  isLoading?: boolean
}

export function PermitsSection({ 
  permite, 
  onChange, 
  isLoading = false 
}: PermitsSectionProps) {
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({
      ...permite,
      status: e.target.value as StatusPermite
    })
  }

  const handleFieldChange = (field: keyof PermiteInfo) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    onChange({
      ...permite,
      [field]: e.target.value
    })
  }

  return (
    <Section 
      title="Licenças e Permits" 
      subtitle="Defina requisitos legais, normativos e de inspeção para o projeto"
    >
      <div className="grid grid-cols-1 gap-4">
        {/* Status dos Permits */}
        <div>
          <Label required>Status dos Permits</Label>
          <Select
            value={permite.status}
            onChange={handleStatusChange}
            disabled={isLoading}
          >
            <option value={StatusPermiteValues.NAO_NECESSARIO}>Não precisa</option>
            <option value={StatusPermiteValues.NECESSARIO}>Cliente já possui</option>
            <option value={StatusPermiteValues.OBTIDO}>Nós faremos</option>
          </Select>
        </div>

        {/* Quais Permits - aparece quando não é "NAO_NECESSARIO" */}
        {permite.status !== StatusPermiteValues.NAO_NECESSARIO && (
          <div>
            <Label>Quais permits/licenças são necessários?</Label>
            <Textarea
              rows={3}
              placeholder="Ex: Licença ambiental, Alvará de construção, ART, etc."
              value={permite.quais_permites || ''}
              onChange={handleFieldChange('quais_permites')}
              disabled={isLoading}
            />
          </div>
        )}

        {/* Normas Aplicáveis */}
        <div>
          <Label>Normas e Regulamentações Aplicáveis</Label>
          <Textarea
            rows={3}
            placeholder="Ex: ABNT NBR, NR-10, NR-35, Código de Obras Municipal, etc."
            value={permite.normas || ''}
            onChange={handleFieldChange('normas')}
            disabled={isLoading}
          />
        </div>

        {/* Inspeções Necessárias */}
        <div>
          <Label>Inspeções e Aprovações Necessárias</Label>
          <Textarea
            rows={3}
            placeholder="Ex: Vistoria do Corpo de Bombeiros, Inspeção de segurança, Aprovação na concessionária, etc."
            value={permite.inspecoes || ''}
            onChange={handleFieldChange('inspecoes')}
            disabled={isLoading}
          />
        </div>

        {/* Informação adicional baseada no status */}
        {permite.status === StatusPermiteValues.NECESSARIO && (
          <div className="rounded-xl bg-brand-primary/10 p-4 border border-brand-primary/30">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-brand-primary mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-sm text-brand-primary">
                <p className="font-medium">Atenção: Permits necessários</p>
                <p className="mt-1">
                  Certifique-se de incluir os custos e prazos para obtenção dos permits no orçamento e cronograma do projeto.
                </p>
              </div>
            </div>
          </div>
        )}

        {permite.status === StatusPermiteValues.OBTIDO && (
          <div className="rounded-xl bg-green-50 p-4 border border-green-200">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-sm text-green-800">
                <p className="font-medium">Permits já obtidos</p>
                <p className="mt-1">
                  Confirme se todos os permits necessários estão válidos e atualizados.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Section>
  )
}
