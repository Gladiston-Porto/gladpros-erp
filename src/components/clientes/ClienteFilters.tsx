'use client'

import React from 'react'
import { Search, X } from 'lucide-react'
import { ClienteFilters as ClienteFiltersInput } from '@/shared/types/cliente'

interface ClienteFiltersProps {
  filters: ClienteFiltersInput
  onFiltersChange: (filters: Partial<ClienteFiltersInput>) => void
  onClear: () => void
}

export function ClienteFilters({ filters, onFiltersChange, onClear }: ClienteFiltersProps) {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ q: e.target.value })
  }

  const handleTipoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ tipo: e.target.value as 'PF' | 'PJ' | 'all' })
  }

  const handleAtivoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    onFiltersChange({
      ativo: value === 'all' ? 'all' : value === 'true',
    })
  }

  const hasActiveFilters = filters.q || filters.tipo !== 'all' || filters.ativo !== 'all'

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border p-4 mb-6">
      <div className="flex flex-wrap gap-4 items-end">
        {/* Search Input */}
        <div className="flex-1 min-w-64">
          <label htmlFor="search" className="block text-sm font-medium text-muted-foreground mb-2">
            Buscar cliente
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <input
              type="text"
              id="search"
              className="block w-full pl-10 pr-3 py-2 border border-border rounded-xl leading-5 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
              placeholder="Nome, email, documento..."
              value={filters.q || ''}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {/* Type Filter */}
        <div className="min-w-32">
          <label htmlFor="tipo" className="block text-sm font-medium text-muted-foreground mb-2">
            Tipo
          </label>
          <select
            id="tipo"
            className="block w-full px-3 py-2 border border-border rounded-xl shadow-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
            value={filters.tipo}
            onChange={handleTipoChange}
          >
            <option value="all">Todos</option>
            <option value="PF">Pessoa Física</option>
            <option value="PJ">Pessoa Jurídica</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="min-w-32">
          <label htmlFor="ativo" className="block text-sm font-medium text-muted-foreground mb-2">
            Status
          </label>
          <select
            id="ativo"
            className="block w-full px-3 py-2 border border-border rounded-xl shadow-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
            value={filters.ativo === 'all' ? 'all' : filters.ativo ? 'true' : 'false'}
            onChange={handleAtivoChange}
          >
            <option value="all">Todos</option>
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </select>
        </div>

        {/* Clear Button */}
        {hasActiveFilters && (
          <div>
            <button
              onClick={onClear}
              className="px-4 py-2 text-sm font-medium text-muted-foreground bg-muted border border-border rounded-xl hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-border transition-colors"
            >
              Limpar
            </button>
          </div>
        )}
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">Filtros ativos:</span>

            {filters.q && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-primary/10 text-brand-primary">
                Busca: &quot;{filters.q}&quot;
                <button
                  type="button"
                  aria-label="Remover filtro de busca"
                  className="ml-1 inline-flex items-center justify-center h-4 w-4 rounded-full text-brand-primary/60 hover:bg-brand-primary/20 hover:text-brand-primary"
                  onClick={() => onFiltersChange({ q: '' })}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            )}

            {filters.tipo !== 'all' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground">
                {filters.tipo === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                <button
                  type="button"
                  aria-label="Remover filtro de tipo"
                  className="ml-1 inline-flex items-center justify-center h-4 w-4 rounded-full text-muted-foreground hover:bg-border hover:text-foreground"
                  onClick={() => onFiltersChange({ tipo: 'all' })}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            )}

            {filters.ativo !== 'all' && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                filters.ativo ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'
              }`}>
                {filters.ativo ? 'Ativo' : 'Inativo'}
                <button
                  type="button"
                  aria-label="Remover filtro de status"
                  className={`ml-1 inline-flex items-center justify-center h-4 w-4 rounded-full ${
                    filters.ativo
                      ? 'text-green-600/60 hover:bg-green-500/20 hover:text-green-600'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  onClick={() => onFiltersChange({ ativo: 'all' })}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
