import React from 'react'
import { TipoCliente } from '@/shared/types/cliente'

interface ClienteCardProps {
  cliente: {
    id: number
    tipo: TipoCliente
    nomeCompletoOuRazao: string
    email: string
    telefone: string
    // suporte a campos legados e novos
    cidade?: string | null
    estado?: string | null
    addressCity?: string | null
    addressState?: string | null
    documentoMasked: string
    ativo: boolean
    criadoEm: string
    atualizadoEm: string
  }
  onView?: (id: number) => void
  onEdit?: (id: number) => void
  onDelete?: (id: number) => void
}

export function ClienteCard({ cliente, onView, onEdit, onDelete }: ClienteCardProps) {
  const handleView = () => onView?.(cliente.id)
  const handleEdit = () => onEdit?.(cliente.id)
  const handleDelete = () => onDelete?.(cliente.id)

  return (
    <div className={`
      bg-card rounded-2xl shadow-sm border border-border p-6 transition-all duration-200
      hover:shadow-md hover:border-brand-primary/30
      ${!cliente.ativo ? 'opacity-60 bg-muted' : ''}
    `}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`
            w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm
            ${cliente.tipo === 'PF' ? 'bg-brand-primary' : 'bg-purple-600'}
          `}>
            {cliente.tipo}
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-lg leading-tight">
              {cliente.nomeCompletoOuRazao}
            </h3>
            <p className="text-sm text-muted-foreground">
              {cliente.tipo === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
            </p>
          </div>
        </div>
        
        {/* Status Badge */}
        <span className={`
          inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
          ${cliente.ativo 
            ? 'bg-green-500/10 text-green-600'
            : 'bg-muted text-muted-foreground'
          }
        `}>
          {cliente.ativo ? 'Ativo' : 'Inativo'}
        </span>
      </div>

      {/* Contact Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <svg className="w-4 h-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="truncate">{cliente.email}</span>
        </div>
        
        {cliente.telefone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <svg className="w-4 h-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span>{cliente.telefone}</span>
          </div>
        )}
        
        {((cliente.addressCity || cliente.cidade) || (cliente.addressState || cliente.estado)) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <svg className="w-4 h-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{[cliente.addressCity || cliente.cidade, cliente.addressState || cliente.estado].filter(Boolean).join(', ')}</span>
          </div>
        )}
      </div>

      {/* Document Info */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
        <svg className="w-4 h-4" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span>{cliente.documentoMasked}</span>
        <span className="mx-1">•</span>
        <span>Created {new Date(cliente.criadoEm).toLocaleDateString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric' })}</span>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4 border-t border-border">
        {onView && (
          <button
            onClick={handleView}
            aria-label={`Ver detalhes de ${cliente.nomeCompletoOuRazao}`}
            className="flex-1 px-3 py-2 text-sm font-medium text-brand-primary bg-brand-primary/10 rounded-xl hover:bg-brand-primary/20 transition-colors"
          >
            Ver Detalhes
          </button>
        )}
        {onEdit && (
          <button
            onClick={handleEdit}
            aria-label={`Editar ${cliente.nomeCompletoOuRazao}`}
            className="flex-1 px-3 py-2 text-sm font-medium text-foreground bg-muted rounded-xl hover:bg-muted/80 transition-colors"
          >
            Editar
          </button>
        )}
        {onDelete && cliente.ativo && (
          <button
            onClick={handleDelete}
            aria-label={`Inativar ${cliente.nomeCompletoOuRazao}`}
            className="px-3 py-2 text-sm font-medium text-destructive bg-destructive/10 rounded-xl hover:bg-destructive/20 transition-colors"
          >
            Inativar
          </button>
        )}
      </div>
    </div>
  )
}
