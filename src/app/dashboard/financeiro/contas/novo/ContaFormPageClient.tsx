'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, AlertCircle, CheckCircle, Building2 } from 'lucide-react'

interface FormData {
  nome: string
  banco: string
  agencia: string
  conta: string
  tipo: string
  moeda: string
  saldoInicial: string
  principal: boolean
}

const TIPOS_CONTA = [
  { value: 'CORRENTE', label: 'Conta Corrente' },
  { value: 'POUPANCA', label: 'Poupança' },
  { value: 'INVESTIMENTO', label: 'Investimento' },
  { value: 'CAIXA', label: 'Caixa' },
  { value: 'CARTEIRA_DIGITAL', label: 'Carteira Digital' },
]

export default function ContaFormPageClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState<FormData>({
    nome: '',
    banco: '',
    agencia: '',
    conta: '',
    tipo: 'CORRENTE',
    moeda: 'USD',
    saldoInicial: '0',
    principal: false,
  })

  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.nome || formData.nome.length < 3) newErrors.nome = 'Nome deve ter no mínimo 3 caracteres'
    if (!formData.banco || formData.banco.length < 2) newErrors.banco = 'Nome do banco é obrigatório'
    if (!formData.conta) newErrors.conta = 'Número da conta é obrigatório'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setError(null)

    try {
      const payload: Record<string, unknown> = {
        empresaId: 1,
        nome: formData.nome,
        banco: formData.banco,
        conta: formData.conta,
        tipo: formData.tipo,
        moeda: formData.moeda,
        saldoInicial: Number(formData.saldoInicial) || 0,
        principal: formData.principal,
      }

      if (formData.agencia) payload.agencia = formData.agencia

      const res = await fetch('/api/financeiro/contas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Erro ao criar conta bancária')
        return
      }

      setSuccess(true)
      setTimeout(() => router.push('/dashboard/financeiro/contas'), 1200)
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-hero-gradient p-6 text-white">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-sm hover:bg-white/20 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
          <div>
            <p className="text-xs uppercase tracking-widest text-white/70">FINANCEIRO / CONTAS</p>
            <h1 className="text-xl font-semibold font-title">Nova Conta Bancária</h1>
          </div>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-800">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">Conta criada com sucesso! Redirecionando...</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informações da Conta */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-5 w-5 text-brand-primary" />
            <h2 className="font-semibold text-foreground">Informações da conta</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="nomeContaBancaria">
                Nome identificador *
              </label>
              <input
                id="nomeContaBancaria"
                type="text"
                value={formData.nome}
                onChange={(e) => handleChange('nome', e.target.value)}
                placeholder="Ex: Conta Principal Chase"
                maxLength={100}
                className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
              {errors.nome && <p className="mt-1 text-xs text-destructive">{errors.nome}</p>}
            </div>

            {/* Banco */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="bancoNome">
                Nome do banco *
              </label>
              <input
                id="bancoNome"
                type="text"
                value={formData.banco}
                onChange={(e) => handleChange('banco', e.target.value)}
                placeholder="Ex: Chase Bank, Bank of America"
                maxLength={100}
                className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
              {errors.banco && <p className="mt-1 text-xs text-destructive">{errors.banco}</p>}
            </div>

            {/* Agência */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="agenciaNome">
                Agência (opcional)
              </label>
              <input
                id="agenciaNome"
                type="text"
                value={formData.agencia}
                onChange={(e) => handleChange('agencia', e.target.value)}
                placeholder="Ex: 0001"
                maxLength={20}
                className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            {/* Número da Conta */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="numeroConta">
                Número da conta *
              </label>
              <input
                id="numeroConta"
                type="text"
                value={formData.conta}
                onChange={(e) => handleChange('conta', e.target.value)}
                placeholder="Ex: 123456789"
                maxLength={20}
                className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
              {errors.conta && <p className="mt-1 text-xs text-destructive">{errors.conta}</p>}
            </div>

            {/* Tipo */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="tipoConta">
                Tipo de conta
              </label>
              <select
                id="tipoConta"
                value={formData.tipo}
                onChange={(e) => handleChange('tipo', e.target.value)}
                className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                {TIPOS_CONTA.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Moeda */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="moedaConta">
                Moeda
              </label>
              <input
                id="moedaConta"
                type="text"
                value={formData.moeda}
                onChange={(e) => handleChange('moeda', e.target.value)}
                maxLength={3}
                className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            {/* Saldo Inicial */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="saldoInicial">
                Saldo inicial (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <input
                  id="saldoInicial"
                  type="number"
                  step="0.01"
                  value={formData.saldoInicial}
                  onChange={(e) => handleChange('saldoInicial', e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-2xl border border-border bg-background pl-7 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
            </div>
          </div>

          {/* Principal */}
          <label className="flex items-center gap-3 cursor-pointer mt-2">
            <input
              type="checkbox"
              checked={formData.principal}
              onChange={(e) => handleChange('principal', e.target.checked)}
              className="h-4 w-4 rounded border-border"
              aria-label="Conta principal"
            />
            <span className="text-sm text-foreground">Definir como conta principal</span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-2xl border border-border bg-card px-6 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || success}
            className="flex items-center gap-2 rounded-2xl bg-brand-primary px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {loading ? 'Salvando...' : 'Salvar conta'}
          </button>
        </div>
      </form>
    </div>
  )
}
