'use client'

import { useState } from 'react'
import { Button } from '@gladpros/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@gladpros/ui/card'
import { Badge } from '@gladpros/ui/badge'
import { Input } from '@gladpros/ui/input'
import {
  DollarSign,
  CheckCircle2,
  Clock,
  PenLine,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/shared/lib/utils'

interface DepositoPanelProps {
  propostaId: number
  depositoPago: boolean
  depositoValor: number | null
  depositoPagoEm: Date | null
  depositoMetodo: string | null
  depositoNotas: string | null
  percentualSinal: number | null
  precoPropostaCliente: number | null
  documensoStatus: string | null
  documensoDocumentId: string | null
  assinaturaTipo: string | null
  assinadaEm: Date | null
  userRole: string
}

const METODOS = [
  { value: 'CHECK', label: 'Check' },
  { value: 'ZELLE', label: 'Zelle' },
  { value: 'VENMO', label: 'Venmo' },
  { value: 'TRANSFER', label: 'Bank Transfer' },
  { value: 'CASH', label: 'Cash' },
  { value: 'OTHER', label: 'Other' },
]

const CAN_UPDATE_ROLES = ['ADMIN', 'GERENTE', 'FINANCEIRO']

export function DepositoPanel({
  propostaId,
  depositoPago,
  depositoValor,
  depositoPagoEm,
  depositoMetodo,
  depositoNotas,
  percentualSinal,
  precoPropostaCliente,
  documensoStatus,
  documensoDocumentId,
  assinaturaTipo,
  assinadaEm,
  userRole,
}: DepositoPanelProps) {
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [paid, setPaid] = useState(depositoPago)
  const [paidAt, setPaidAt] = useState(depositoPagoEm)
  const [metodo, setMetodo] = useState(depositoMetodo ?? '')
  const [valor, setValor] = useState(depositoValor ?? precoPropostaCliente ? 
    ((precoPropostaCliente ?? 0) * (percentualSinal ?? 30)) / 100 : 0)
  const [notas, setNotas] = useState(depositoNotas ?? '')

  const canUpdate = CAN_UPDATE_ROLES.includes(userRole)

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/propostas/${propostaId}/deposit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          depositoPago: true,
          depositoMetodo: metodo || undefined,
          depositoValor: valor || undefined,
          depositoNotas: notas || undefined,
        }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setPaid(true)
      setPaidAt(new Date())
      setShowForm(false)
    } catch (err) {
      alert('Erro ao salvar: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSaving(false)
    }
  }

  async function handleUnmark() {
    if (!confirm('Desmarcar depósito como pago?')) return
    setSaving(true)
    try {
      const res = await fetch(`/api/propostas/${propostaId}/deposit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ depositoPago: false }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setPaid(false)
      setPaidAt(null)
    } catch (err) {
      alert('Erro: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSaving(false)
    }
  }

  const depositAmt = depositoValor ?? (precoPropostaCliente
    ? (precoPropostaCliente * (percentualSinal ?? 30)) / 100
    : null)

  return (
    <div className="space-y-4">
      {/* Documenso signature status */}
      {assinaturaTipo === 'DOCUMENSO' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <PenLine className="h-4 w-4 text-brand-primary" />
              Assinatura Eletrônica
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 flex-wrap">
              {!documensoStatus && (
                <Badge variant="outline" className="bg-muted text-muted-foreground">
                  Não enviado
                </Badge>
              )}
              {documensoStatus === 'PENDING' && (
                <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                  <Clock className="h-3 w-3 mr-1" />
                  Aguardando assinatura
                </Badge>
              )}
              {documensoStatus === 'COMPLETED' && (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Assinado
                </Badge>
              )}
              {documensoStatus === 'EXPIRED' && (
                <Badge className="bg-destructive/10 text-destructive border-destructive/30">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Expirado
                </Badge>
              )}
              {documensoStatus === 'CANCELLED' && (
                <Badge variant="outline" className="bg-muted text-muted-foreground">
                  Cancelado
                </Badge>
              )}

              {assinadaEm && (
                <span className="text-sm text-muted-foreground">
                  Assinado em {formatDate(assinadaEm)}
                </span>
              )}

              {documensoDocumentId && (
                <a
                  href={`https://app.documenso.com/documents/${documensoDocumentId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-primary hover:underline flex items-center gap-1"
                  aria-label="Ver documento no Documenso"
                >
                  Ver no Documenso
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deposit tracking */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4 text-brand-primary" />
            Depósito
            {depositAmt !== null && (
              <span className="text-sm font-normal text-muted-foreground">
                ({percentualSinal ?? 30}% — {formatCurrency(depositAmt)})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            {paid ? (
              <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Pago
              </Badge>
            ) : (
              <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                <Clock className="h-3 w-3 mr-1" />
                Aguardando pagamento
              </Badge>
            )}

            {paid && paidAt && (
              <span className="text-sm text-muted-foreground">
                em {formatDate(paidAt)}
              </span>
            )}
            {paid && depositoMetodo && (
              <span className="text-sm text-muted-foreground">
                via {METODOS.find(m => m.value === depositoMetodo)?.label ?? depositoMetodo}
              </span>
            )}
          </div>

          {paid && depositoNotas && (
            <p className="text-sm text-muted-foreground">{depositoNotas}</p>
          )}

          {canUpdate && !showForm && (
            <div className="flex gap-2 pt-1">
              {!paid ? (
                <Button size="sm" onClick={() => setShowForm(true)}>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Marcar como Pago
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={handleUnmark} disabled={saving}>
                  Desmarcar
                </Button>
              )}
            </div>
          )}

          {/* Mark as paid form */}
          {canUpdate && showForm && (
            <div className="border border-border rounded-2xl p-4 space-y-3 bg-muted/30">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block" htmlFor="dep-metodo">
                    Método de pagamento
                  </label>
                  <select
                    id="dep-metodo"
                    value={metodo}
                    onChange={(e) => setMetodo(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    aria-label="Método de pagamento"
                  >
                    <option value="">Selecionar...</option>
                    {METODOS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block" htmlFor="dep-valor">
                    Valor recebido (USD)
                  </label>
                  <Input
                    id="dep-valor"
                    type="number"
                    min="0"
                    step="0.01"
                    value={valor}
                    onChange={(e) => setValor(parseFloat(e.target.value) || 0)}
                    aria-label="Valor recebido"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block" htmlFor="dep-notas">
                  Notas (opcional)
                </label>
                <Input
                  id="dep-notas"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Ex: cheque #1234, confirmado pelo banco..."
                  aria-label="Notas do depósito"
                />
              </div>

              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? 'Salvando...' : 'Confirmar Pagamento'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
