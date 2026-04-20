'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@gladpros/ui/button'
import { Plus, AlertCircle, CheckCircle } from 'lucide-react'

interface Conta {
  id: number
  nome: string
  banco: string
  saldoAtual: number
}

interface Props {
  onSuccess?: () => void
}

export default function NovaTransferenciaDialog({ onSuccess }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [contas, setContas] = useState<Conta[]>([])

  const [form, setForm] = useState({
    contaOrigemId: '',
    contaDestinoId: '',
    valor: '',
    descricao: '',
    data: new Date().toISOString().split('T')[0],
  })

  const loadContas = useCallback(async () => {
    try {
      const res = await fetch('/api/financeiro/contas?empresaId=1&ativo=true')
      const data = await res.json()
      if (data.success) setContas(data.data)
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    if (open) loadContas()
  }, [open, loadContas])

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  const contasDestino = contas.filter((c) => String(c.id) !== form.contaOrigemId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.contaOrigemId || !form.contaDestinoId) {
      setError('Selecione as contas de origem e destino')
      return
    }
    if (!form.valor || Number(form.valor) <= 0) {
      setError('Valor deve ser positivo')
      return
    }
    if (!form.descricao.trim()) {
      setError('Descrição é obrigatória')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/financeiro/transferencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contaOrigemId: Number(form.contaOrigemId),
          contaDestinoId: Number(form.contaDestinoId),
          valor: Number(form.valor),
          descricao: form.descricao,
          dataAgendamento: new Date(form.data).toISOString(),
          empresaId: 1,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Erro ao criar transferência')
        return
      }

      setSuccess(true)
      setTimeout(() => {
        setOpen(false)
        setSuccess(false)
        setForm({
          contaOrigemId: '',
          contaDestinoId: '',
          valor: '',
          descricao: '',
          data: new Date().toISOString().split('T')[0],
        })
        router.refresh()
        onSuccess?.()
      }, 1000)
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button size="lg" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Nova transferência
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-title">Nova Transferência</DialogTitle>
          </DialogHeader>

          {success && (
            <div className="flex items-center gap-3 rounded-2xl bg-green-50 border border-green-200 p-3 text-green-800">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <p className="text-sm">Transferência criada com sucesso!</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 rounded-2xl bg-destructive/5 border border-destructive/20 p-3 text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Conta Origem */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="contaOrigemId">
                Conta de origem *
              </label>
              <select
                id="contaOrigemId"
                value={form.contaOrigemId}
                onChange={(e) => handleChange('contaOrigemId', e.target.value)}
                required
                className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="">Selecionar conta...</option>
                {contas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} — {c.banco}
                  </option>
                ))}
              </select>
            </div>

            {/* Conta Destino */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="contaDestinoId">
                Conta de destino *
              </label>
              <select
                id="contaDestinoId"
                value={form.contaDestinoId}
                onChange={(e) => handleChange('contaDestinoId', e.target.value)}
                required
                className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="">Selecionar conta...</option>
                {contasDestino.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} — {c.banco}
                  </option>
                ))}
              </select>
            </div>

            {/* Valor */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="valorTransf">
                Valor (USD) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <input
                  id="valorTransf"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.valor}
                  onChange={(e) => handleChange('valor', e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full rounded-2xl border border-border bg-background pl-7 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="descricaoTransf">
                Descrição *
              </label>
              <input
                id="descricaoTransf"
                type="text"
                value={form.descricao}
                onChange={(e) => handleChange('descricao', e.target.value)}
                placeholder="Ex: Cobertura de despesas operacionais"
                required
                className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            {/* Data */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="dataTransf">
                Data
              </label>
              <input
                id="dataTransf"
                type="date"
                value={form.data}
                onChange={(e) => handleChange('data', e.target.value)}
                className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-2xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || success}
                className="flex-1 rounded-2xl"
              >
                {loading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : null}
                {loading ? 'Salvando...' : 'Criar transferência'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
