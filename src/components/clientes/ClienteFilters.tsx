import React from 'react'
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
      ativo: value === 'all' ? 'all' : value === 'true' 
    })
  }

  const hasActiveFilters = filters.q || filters.tipo !== 'all' || filters.ativo !== 'all'

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex flex-wrap gap-4 items-end">
        {/* Search Input */}
        <div className="flex-1 min-w-64">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
            Buscar cliente
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              id="search"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
              placeholder="Nome, email, documento..."
              value={filters.q || ''}
              onChange={handleSearchChange}
            />
          </div>
        </div>

        {/* Type Filter */}
        <div className="min-w-32">
          <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-2">
            Tipo
          </label>
          <select
            id="tipo"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
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
          <label htmlFor="ativo" className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            id="ativo"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
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
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              Limpar
            </button>
          </div>
        )}
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-500">Filtros ativos:</span>
            
            {filters.q && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Busca: &quot;{filters.q}&quot;
                <button
                  type="button"
                  className="ml-1 inline-flex items-center justify-center h-4 w-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-500"
                  onClick={() => onFiltersChange({ q: '' })}
                >
                  <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                    <path strokeLinecap="round" d="m1 1 6 6m0-6-6 6" />
                  </svg>
                </button>
              </span>
            )}
            
            {filters.tipo !== 'all' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                {filters.tipo === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                <button
                  type="button"
                  className="ml-1 inline-flex items-center justify-center h-4 w-4 rounded-full text-purple-400 hover:bg-purple-200 hover:text-purple-500"
                  onClick={() => onFiltersChange({ tipo: 'all' })}
                >
                  <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                    <path strokeLinecap="round" d="m1 1 6 6m0-6-6 6" />
                  </svg>
                </button>
              </span>
            )}
            
            {filters.ativo !== 'all' && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                filters.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {filters.ativo ? 'Ativo' : 'Inativo'}
                <button
                  type="button"
                  className={`ml-1 inline-flex items-center justify-center h-4 w-4 rounded-full ${
                    filters.ativo 
                      ? 'text-green-400 hover:bg-green-200 hover:text-green-500'
                      : 'text-gray-400 hover:bg-gray-200 hover:text-gray-500'
                  }`}
                  onClick={() => onFiltersChange({ ativo: 'all' })}
                >
                  <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                    <path strokeLinecap="round" d="m1 1 6 6m0-6-6 6" />
                  </svg>
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
