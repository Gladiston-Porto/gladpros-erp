'use client'

import React from 'react'
import { Label, Input, Textarea, Select } from '../ui-components'
import { ClienteInfo } from '../types'

interface ClienteAPI {
  id: string
  nomeCompleto?: string
  razaoSocial?: string
  nomeFantasia?: string
  email: string
  telefone?: string
}

interface IdentificacaoSectionProps {
  cliente: ClienteInfo
  escopo: string
  clientes: ClienteAPI[]
  clientesLoading: boolean
  onClienteChange: (cliente: ClienteInfo) => void
  onEscopoChange: (escopo: string) => void
  onClienteSelect: (clienteId: string) => void
}

export function IdentificacaoSection({
  cliente,
  escopo,
  clientes,
  clientesLoading,
  onClienteChange,
  onEscopoChange,
  onClienteSelect,
}: IdentificacaoSectionProps) {
  const inputClass = 'mt-1 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary'

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label required>Cliente</Label>
          {clientesLoading ? (
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted px-3 py-2">
              <div className="h-4 w-4 animate-spin rounded-full border border-border border-t-brand-primary"></div>
              <span className="text-sm text-muted-foreground">Carregando clientes...</span>
            </div>
          ) : (
            <Select
              value={cliente.id}
              onChange={(e) => onClienteSelect(e.target.value)}
              disabled={clientesLoading}
              className={inputClass}
              aria-label="Selecionar cliente"
            >
              <option value="">Selecionar cliente…</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nomeCompleto || c.razaoSocial || c.nomeFantasia} - {c.email}
                </option>
              ))}
            </Select>
          )}
        </div>
        <div>
          <Label required>Título</Label>
          <Input
            placeholder="Reforma elétrica apto 12B"
            value={cliente.titulo}
            onChange={(e) => onClienteChange({ ...cliente, titulo: e.target.value })}
            className={inputClass}
            aria-label="Título da proposta"
          />
        </div>
        <div>
          <Label required>Contato – Nome</Label>
          <Input
            value={cliente.contato_nome}
            onChange={(e) => onClienteChange({ ...cliente, contato_nome: e.target.value })}
            className={inputClass}
            aria-label="Nome do contato"
          />
        </div>
        <div>
          <Label required>Contato – E‑mail</Label>
          <Input
            type="email"
            value={cliente.contato_email}
            onChange={(e) => onClienteChange({ ...cliente, contato_email: e.target.value })}
            className={inputClass}
            aria-label="E-mail do contato"
          />
        </div>
        <div>
          <Label>Contato – Telefone</Label>
          <Input
            value={cliente.contato_telefone || ''}
            onChange={(e) => onClienteChange({ ...cliente, contato_telefone: e.target.value })}
            className={inputClass}
            aria-label="Telefone do contato"
          />
        </div>
        <div className="md:col-span-2">
          <Label required>Endereço de execução</Label>
          <Input
            placeholder="Rua, nº, cidade, estado, CEP"
            value={cliente.local_endereco}
            onChange={(e) => onClienteChange({ ...cliente, local_endereco: e.target.value })}
            className={inputClass}
            aria-label="Endereço de execução do serviço"
          />
        </div>
        <div className="md:col-span-2">
          <Label required>Escopo (resumo)</Label>
          <Textarea
            placeholder="Descreva o escopo geral do serviço…"
            value={escopo}
            onChange={(e) => onEscopoChange(e.target.value)}
            className={`${inputClass} min-h-[80px]`}
            aria-label="Escopo do serviço"
          />
        </div>
      </div>
    </div>
  )
}
