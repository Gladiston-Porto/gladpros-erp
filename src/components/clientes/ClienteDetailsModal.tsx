import React, { useState, useEffect, useRef } from 'react'
import { Button } from "@gladpros/ui/button";
import { useToast } from "@gladpros/ui/toast";
import { ClienteHistorico } from './ClienteHistorico';

interface ClienteDetailsModalProps {
  clienteId: number | null
  isOpen: boolean
  onClose: () => void
  onEdit?: (id: number) => void
  onDelete?: (id: number) => void
}

interface ClienteDetails {
  id: number
  tipo: 'PF' | 'PJ'
  nomeCompleto?: string | null
  razaoSocial?: string | null
  nomeFantasia?: string | null
  email: string
  telefone: string
  // campos de endereço atuais
  addressStreet?: string | null
  addressUnit?: string | null
  addressCity?: string | null
  addressState?: string | null
  addressZip?: string | null
  addressCounty?: string | null
  observacoes?: string | null
  ativo: boolean
  documentoMasked: string
  criadoEm: string
  atualizadoEm: string
  metrics?: {
    canViewFinancial?: boolean
    lifetimeValue?: number
    outstandingValue?: number
    paidInvoices?: number
    openInvoices?: number
    projetosCount: number
    serviceOrdersCount: number
    completedServiceOrdersCount: number
    lastInvoiceAt: string | null
  }
}

export function ClienteDetailsModal({ 
  clienteId, 
  isOpen, 
  onClose, 
  onEdit, 
  onDelete 
}: ClienteDetailsModalProps) {
  const toast = useToast()
  const [cliente, setCliente] = useState<ClienteDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)

  // Fetch cliente details
  useEffect(() => {
    if (!isOpen || !clienteId) {
      setCliente(null)
      setError(null)
      return
    }

    const controller = new AbortController()

    const fetchClienteDetails = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/clientes/${clienteId}`, { signal: controller.signal })
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Erro ao carregar cliente')
        }

        const data = await response.json()
        setCliente(data.data ?? data)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return
        }
        toast.error('Erro', 'Falha ao carregar detalhes do cliente')
        setError(err instanceof Error ? err.message : 'Erro inesperado')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchClienteDetails()
    return () => {
      controller.abort()
    }
  }, [clienteId, isOpen, toast])

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  const nomeExibido = cliente?.tipo === 'PF'
    ? cliente?.nomeCompleto
    : (cliente?.nomeFantasia || cliente?.razaoSocial)

  const formatUSD = (value: number | undefined) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value ?? 0)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cliente-details-title"
          ref={dialogRef}
          className="relative bg-card border border-border rounded-2xl shadow-elevated max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        >

          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 id="cliente-details-title" className="font-title text-xl font-semibold text-foreground">
              Detalhes do Cliente
            </h2>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              aria-label="Fechar"
              className="min-h-12 min-w-12 rounded-2xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-2xl h-8 w-8 border-b-2 border-brand-primary" />
                <span className="ml-3 text-muted-foreground text-sm">Carregando...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="mx-auto h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
                  <svg className="h-6 w-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground">Erro ao carregar</h3>
                <p className="mt-2 text-muted-foreground text-sm">{error}</p>
                <button onClick={onClose} className="mt-4 px-4 py-2 bg-muted text-muted-foreground rounded-xl text-sm hover:bg-muted/80 transition-colors">
                  Fechar
                </button>
              </div>
            ) : cliente ? (
              <div className="space-y-6">
                {/* Hero do cliente */}
                <div className="flex items-start justify-between rounded-2xl bg-muted/40 border border-border p-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-bold text-white ${cliente.tipo === 'PF' ? 'bg-brand-primary' : 'bg-brand-secondary'}`}>
                      {cliente.tipo}
                    </div>
                    <div>
                      <h3 className="font-title text-lg font-semibold text-foreground">{nomeExibido}</h3>
                      <p className="text-muted-foreground text-sm">{cliente.tipo === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${cliente.ativo ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
                    {cliente.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Dados Principais */}
                  <div className="space-y-4">
                    <h4 className="font-title text-base font-semibold text-foreground border-b border-border pb-2">Dados Principais</h4>

                    {cliente.tipo === 'PJ' && cliente.razaoSocial && (
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Razão Social</label>
                        <p className="text-foreground text-sm">{cliente.razaoSocial}</p>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">E-mail</label>
                      <p className="text-foreground text-sm">{cliente.email}</p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Telefone</label>
                      <p className="text-foreground text-sm">{cliente.telefone}</p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">{cliente.tipo === 'PF' ? 'SSN/ITIN' : 'EIN'}</label>
                      <p className="text-foreground text-sm font-mono">{cliente.documentoMasked}</p>
                    </div>
                  </div>

                  {/* Endereço */}
                  <div className="space-y-4">
                    <h4 className="font-title text-base font-semibold text-foreground border-b border-border pb-2">Endereço</h4>

                    {cliente.addressStreet && (
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Endereço</label>
                        <p className="text-foreground text-sm">{cliente.addressStreet}</p>
                        {cliente.addressUnit && (
                          <p className="text-muted-foreground text-xs mt-0.5">Apt/Unit: {cliente.addressUnit}</p>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Cidade</label>
                        <p className="text-foreground text-sm">{cliente.addressCity || '—'}</p>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Estado</label>
                        <p className="text-foreground text-sm">{cliente.addressState || '—'}</p>
                      </div>
                    </div>

                    {cliente.addressZip && (
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">ZIP Code</label>
                        <p className="text-foreground text-sm">{cliente.addressZip}</p>
                      </div>
                    )}

                    {cliente.addressCounty && (
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">County</label>
                        <p className="text-foreground text-sm">{cliente.addressCounty}</p>
                      </div>
                    )}
                  </div>
                </div>

                {cliente.metrics ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {cliente.metrics.canViewFinancial ? (
                      <>
                        <MetricTile label="LTV Recebido" value={formatUSD(cliente.metrics.lifetimeValue)} />
                        <MetricTile label="Aberto em Invoices" value={formatUSD(cliente.metrics.outstandingValue)} />
                      </>
                    ) : null}
                    <MetricTile label="Projetos" value={String(cliente.metrics.projetosCount)} helper={`${cliente.metrics.serviceOrdersCount} OS`} />
                    {cliente.metrics.canViewFinancial ? (
                      <MetricTile
                        label="Cobrança"
                        value={`${cliente.metrics.paidInvoices ?? 0} pagas`}
                        helper={`${cliente.metrics.openInvoices ?? 0} em aberto`}
                      />
                    ) : null}
                  </div>
                ) : null}

                {/* Observações */}
                {cliente.observacoes && (
                  <div>
                    <h4 className="font-title text-base font-semibold text-foreground border-b border-border pb-2 mb-4">Observações</h4>
                    <p className="text-muted-foreground text-sm whitespace-pre-wrap bg-muted/30 p-4 rounded-2xl border border-border">
                      {cliente.observacoes}
                    </p>
                  </div>
                )}

                {/* Metadados */}
                <div className="bg-muted/30 rounded-2xl border border-border p-4">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Informações do Sistema</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Criado em:</span>
                      <p className="text-foreground mt-0.5">
                        {new Date(cliente.criadoEm).toLocaleString('en-US', { timeZone: 'America/Chicago' })}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Última atualização:</span>
                      <p className="text-foreground mt-0.5">
                        {new Date(cliente.atualizadoEm).toLocaleString('en-US', { timeZone: 'America/Chicago' })}
                      </p>
                    </div>
                    {cliente.metrics?.canViewFinancial && cliente.metrics?.lastInvoiceAt ? (
                      <div>
                        <span className="text-muted-foreground">Última invoice:</span>
                        <p className="text-foreground mt-0.5">
                          {new Date(cliente.metrics.lastInvoiceAt).toLocaleString('en-US', { timeZone: 'America/Chicago' })}
                        </p>
                      </div>
                    ) : null}
                    <div>
                      <span className="text-muted-foreground">OS concluídas:</span>
                      <p className="text-foreground mt-0.5">
                        {cliente.metrics?.completedServiceOrdersCount ?? 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-title text-base font-semibold text-foreground border-b border-border pb-2">Histórico Operacional</h4>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Visualização consolidada de propostas, projetos, OS, invoices e garantias vinculadas ao cliente.
                    </p>
                  </div>
                  <ClienteHistorico clienteId={cliente.id} />
                </div>
              </div>
            ) : null}
          </div>

          {/* Footer */}
          {cliente && (
            <div className="flex gap-3 px-6 py-4 border-t border-border bg-muted/20">
              {onEdit && (
                <Button
                  variant="outline"
                  onClick={() => onEdit(cliente.id)}
                  className="min-h-12 border-brand-primary/20 text-brand-primary hover:bg-brand-primary/10"
                >
                  Editar Cliente
                </Button>
              )}
              {onDelete && cliente.ativo && (
                <Button
                  variant="outline"
                  onClick={() => onDelete(cliente.id)}
                  className="min-h-12 border-destructive/20 text-destructive hover:bg-destructive/10"
                >
                  Inativar Cliente
                </Button>
              )}
              <div className="flex-1" />
              <Button
                variant="outline"
                onClick={onClose}
                className="min-h-12"
              >
                Fechar
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MetricTile({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-title text-lg text-foreground">{value}</p>
      {helper ? <p className="mt-1 text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  )
}
