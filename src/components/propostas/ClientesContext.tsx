'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface ClienteAPI {
  id: string
  // The API returns `nomeCompletoOuRazao` as a pre-computed display name.
  // We normalize it to `nomeCompleto` so form consumers don't need to know the API field name.
  nomeCompleto: string
  email: string
  telefone?: string
  // Address fields returned by the clientes API (for auto-populating form)
  addressStreet?: string
  addressUnit?: string
  addressCity?: string
  addressState?: string
  addressZip?: string
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
      // Normalize API response: convert numeric id → string, map nomeCompletoOuRazao → nomeCompleto
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setClientes((data.data || []).map((c: any): ClienteAPI => ({
        id: String(c.id),
        nomeCompleto: c.nomeCompletoOuRazao || c.nomeCompleto || c.razaoSocial || c.nomeFantasia || 'Cliente sem nome',
        email: c.email || '',
        telefone: c.telefone || undefined,
        addressStreet: c.addressStreet || undefined,
        addressUnit: c.addressUnit || undefined,
        addressCity: c.addressCity || undefined,
        addressState: c.addressState || undefined,
        addressZip: c.addressZip || undefined,
      })))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
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
