'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface ClienteAPI {
  id: string
  nomeCompleto?: string
  razaoSocial?: string
  nomeFantasia?: string
  email: string
  telefone?: string
}

interface ClientesContextType {
  clientes: ClienteAPI[]
  loading: boolean
  error: string | null
  refetch: () => void
}

const ClientesContext = createContext<ClientesContextType | undefined>(undefined)

export function ClientesProvider({ children }: { children: ReactNode }) {
  const [clientes, setClientes] = useState<ClienteAPI[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClientes = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/clientes?pageSize=1000')
      if (!response.ok) {
        throw new Error('Erro ao carregar clientes')
      }
      
      const data = await response.json()
      setClientes(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      console.error('Erro ao carregar clientes:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClientes()
  }, [])

  const refetch = () => {
    fetchClientes()
  }

  return (
    <ClientesContext.Provider value={{ clientes, loading, error, refetch }}>
      {children}
    </ClientesContext.Provider>
  )
}

export function useClientes() {
  const context = useContext(ClientesContext)
  if (context === undefined) {
    throw new Error('useClientes must be used within a ClientesProvider')
  }
  return context
}
