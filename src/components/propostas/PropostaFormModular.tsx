'use client'

import React, { useState } from 'react'
import { StatusProposta, StatusPropostaValues, StatusPermiteValues } from '@/shared/types/prisma-temp';
import { 
  TotaisCalculados,
  PrazosInfo,
  ComercialInfo,
  PermiteInfo,
  ObservacoesInfo,
  EscopoInfo,
  FaturamentoInfo,
  InternoInfo,
  Material,
  Etapa
} from './types'
import { 
  EscopoSection,
  PrazosSection,
  PermitsSection,
  MaterialSection,
  EtapasSection,
  ComercialSection,
  FaturamentoSection,
  ObservacoesSection,
  ResumoPrecoSidebar
} from './sections'

// Componente Header simplificado
const FormHeader = ({ 
  onSave, 
  onSubmit, 
  isLoading
}: {
  onSave: () => void
  onSubmit: () => void
  isLoading: boolean
}) => (
  <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
    <div className="mx-auto max-w-7xl px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Nova Proposta (Modular)</h1>
          <p className="text-sm text-slate-500">Versão componentizada com seções independentes</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onSave}
            disabled={isLoading}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {isLoading ? 'Salvando...' : 'Salvar Rascunho'}
          </button>
          <button
            onClick={onSubmit}
            disabled={isLoading}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Enviando...' : 'Enviar Proposta'}
          </button>
        </div>
      </div>
    </div>
  </header>
)

export function PropostaFormModular() {
  // Estados iniciais simplificados
  const [escopo, setEscopo] = useState<EscopoInfo>({
    titulo: '',
    escopo: '',
    resumo_executivo: ''
  })

  const [prazos, setPrazos] = useState<PrazosInfo>({
    tempo_para_aceite: 30,
    validade_proposta: new Date().toISOString().split('T')[0],
    prazo_execucao_dias: 30,
    janela: '',
    restricoes: ''
  })

  const [permite, setPermite] = useState<PermiteInfo>({
    status: StatusPermiteValues.NAO_NECESSARIO,
    quais_permites: '',
    normas: '',
    inspecoes: ''
  })

  const [materiais, setMateriais] = useState<Material[]>([])
  const [etapas, setEtapas] = useState<Etapa[]>([])

  const [comercial, setComercial] = useState<ComercialInfo>({
    valor_proposta: 0,
    prazo_validade: 30,
    local_execucao: '',
    condicoes_pagamento: [],
    observacoes: '',
    garantias: ''
  })

  const [faturamento, setFaturamento] = useState<FaturamentoInfo>({
    gatilho: "na_aprovacao",
    percentual_sinal: 30,
    forma_preferida: '',
    instrucoes: ''
  })

  const [interno, setInterno] = useState<InternoInfo>({
    custo_material: 0,
    custo_mo: 0,
    horas_mo: 0,
    custo_terceiros: 0,
    overhead_pct: 15,
    margem_pct: 20,
    impostos_pct: 8,
    contingencia_pct: 5,
    frete: 0
  })

  const [observacoes, setObservacoes] = useState<ObservacoesInfo>({
    obs_cliente: '',
    obs_internas: ''
  })

  const [status, setStatus] = useState<StatusProposta>(StatusPropostaValues.RASCUNHO)
  const [isLoading, setIsLoading] = useState(false)

  // Cálculos de totais
  const totais: TotaisCalculados = React.useMemo(() => {
    const base = interno.custo_material + interno.custo_mo + interno.custo_terceiros + interno.frete
    const overhead = base * (interno.overhead_pct / 100)
    const margem = (base + overhead) * (interno.margem_pct / 100)
    const conting = (base + overhead + margem) * (interno.contingencia_pct / 100)
    const impostos = (base + overhead + margem + conting) * (interno.impostos_pct / 100)
    
    return {
      mat: interno.custo_material,
      mo: interno.custo_mo,
      terce: interno.custo_terceiros,
      frete: interno.frete,
      overhead,
      margem,
      conting,
      impostos,
      precoCliente: base + overhead + margem + conting + impostos
    }
  }, [interno])

  // Handlers simplificados
  const handleSave = async () => {
    setIsLoading(true)
    try {
      // Simular salvamento
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      // Simular envio
      await new Promise(resolve => setTimeout(resolve, 2000))
      setStatus(StatusPropostaValues.PENDENTE_APROVACAO)
    } catch (error) {
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <FormHeader 
        onSave={handleSave}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
      
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Coluna principal com as seções */}
          <div className="order-2 space-y-8 lg:order-1 lg:col-span-2">
            <EscopoSection 
              escopo={escopo} 
              onChange={setEscopo} 
            />
            
            <PrazosSection 
              prazos={prazos} 
              onPrazosChange={setPrazos} 
            />
            
            <PermitsSection 
              permite={permite} 
              onChange={setPermite} 
            />
            
            <MaterialSection 
              materiais={materiais} 
              onMateriaisChange={setMateriais} 
            />
            
            <EtapasSection 
              etapas={etapas} 
              onEtapasChange={setEtapas} 
            />
            
            <ComercialSection 
              comercial={comercial} 
              onChange={setComercial} 
            />
            
            <FaturamentoSection 
              faturamento={faturamento} 
              onChange={setFaturamento} 
            />
            
            <ObservacoesSection 
              observacoes={observacoes} 
              onChange={setObservacoes} 
            />
          </div>

          {/* Sidebar com resumo */}
          <ResumoPrecoSidebar
            totais={totais}
            interno={interno}
            status={status}
            onInternoChange={setInterno}
            onStatusChange={setStatus}
          />
        </div>
      </main>
    </div>
  )
}
