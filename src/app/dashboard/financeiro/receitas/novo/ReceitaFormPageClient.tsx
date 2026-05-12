'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Save,
  AlertCircle,
  CheckCircle,
  DollarSign,
  FileText,
  User,
  RefreshCw,
} from 'lucide-react'

interface Category {
  id: number
  nome: string
  cor: string
}

interface Cliente {
  id: number
  nomeFantasia: string | null
  razaoSocial: string | null
  nomeCompleto: string | null
}

interface FormData {
  empresaId: number
  categoriaId: string
  clienteId: string
  descricao: string
  valor: string
  tipo: string
  formaPagamento: string
  dataEmissao: string
  dataVencimento: string
  status: string
  observacoes: string
  recorrente: boolean
  recorrencia: {
    frequencia: string
    diaVencimento: string
    dataInicio: string
    dataFim: string
  }
}

const TIPOS = [
  { value: 'SERVICO', label: 'Serviço' },
  { value: 'VENDA_PRODUTO', label: 'Venda de Produto' },
  { value: 'CONSULTORIA', label: 'Consultoria' },
  { value: 'MENSALIDADE', label: 'Mensalidade' },
  { value: 'COMISSAO', label: 'Comissão' },
  { value: 'OUTROS', label: 'Outros' },
]

const FORMAS_PAGAMENTO = [
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'CARTAO_CREDITO', label: 'Cartão de Crédito' },
  { value: 'CARTAO_DEBITO', label: 'Cartão de Débito' },
  { value: 'PIX', label: 'PIX' },
  { value: 'TRANSFERENCIA', label: 'Transferência' },
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'CHEQUE', label: 'Cheque' },
]

const FREQUENCIAS = [
  { value: 'SEMANAL', label: 'Semanal' },
  { value: 'QUINZENAL', label: 'Quinzenal' },
  { value: 'MENSAL', label: 'Mensal' },
  { value: 'BIMESTRAL', label: 'Bimestral' },
  { value: 'TRIMESTRAL', label: 'Trimestral' },
  { value: 'SEMESTRAL', label: 'Semestral' },
  { value: 'ANUAL', label: 'Anual' },
]

export default function ReceitaFormPageClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const today = new Date().toISOString().split('T')[0]

  const [formData, setFormData] = useState<FormData>({
    empresaId: 1,
    categoriaId: '',
    clienteId: '',
    descricao: '',
    valor: '',
    tipo: 'SERVICO',
    formaPagamento: 'PIX',
    dataEmissao: today,
    dataVencimento: '',
    status: 'PENDENTE',
    observacoes: '',
    recorrente: false,
    recorrencia: {
      frequencia: 'MENSAL',
      diaVencimento: '1',
      dataInicio: today,
      dataFim: '',
    },
  })

  useEffect(() => {
    loadCategories()
    loadClientes()
  }, [])

  const loadCategories = async () => {
    try {
      const res = await fetch('/api/financeiro/receitas/categorias?empresaId=1')
      const data = await res.json()
      if (data.success) setCategories(data.data)
    } catch {
      // silent
    }
  }

  const loadClientes = async () => {
    try {
      const res = await fetch('/api/clientes?empresaId=1&pageSize=100')
      const data = await res.json()
      if (data.success) setClientes(data.data)
    } catch {
      // silent
    }
  }

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const handleRecorrenciaChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      recorrencia: { ...prev.recorrencia, [field]: value },
    }))
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.categoriaId) newErrors.categoriaId = 'Categoria é obrigatória'
    if (!formData.descricao || formData.descricao.length < 3) newErrors.descricao = 'Descrição deve ter no mínimo 3 caracteres'
    if (!formData.valor || Number(formData.valor) <= 0) newErrors.valor = 'Valor deve ser positivo'
    if (!formData.dataEmissao) newErrors.dataEmissao = 'Data de emissão é obrigatória'
    if (!formData.dataVencimento) newErrors.dataVencimento = 'Data de vencimento é obrigatória'
    if (formData.dataVencimento && formData.dataEmissao && formData.dataVencimento < formData.dataEmissao) {
      newErrors.dataVencimento = 'Data de vencimento deve ser igual ou posterior à emissão'
    }
    if (formData.recorrente && !formData.recorrencia.frequencia) {
      newErrors['recorrencia.frequencia'] = 'Frequência é obrigatória'
    }
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
        categoriaId: Number(formData.categoriaId),
        descricao: formData.descricao,
        valor: Number(formData.valor),
        tipo: formData.tipo,
        formaPagamento: formData.formaPagamento,
        dataEmissao: new Date(formData.dataEmissao).toISOString(),
        dataVencimento: new Date(formData.dataVencimento).toISOString(),
        status: formData.status,
        recorrente: formData.recorrente,
      }

      if (formData.clienteId) payload.clienteId = Number(formData.clienteId)
      if (formData.observacoes) payload.observacoes = formData.observacoes
      if (formData.recorrente) {
        payload.recorrencia = {
          frequencia: formData.recorrencia.frequencia,
          diaVencimento: Number(formData.recorrencia.diaVencimento),
          dataInicio: new Date(formData.recorrencia.dataInicio).toISOString(),
          ...(formData.recorrencia.dataFim ? { dataFim: new Date(formData.recorrencia.dataFim).toISOString() } : {}),
        }
      }

      const res = await fetch('/api/financeiro/receitas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Erro ao criar receita')
        return
      }

      setSuccess(true)
      setTimeout(() => router.push('/dashboard/financeiro/receitas'), 1200)
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
            <p className="text-xs uppercase tracking-widest text-white/70">FINANCEIRO / RECEITAS</p>
            <h1 className="text-xl font-semibold font-title">Nova Receita</h1>
          </div>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-800">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">Receita criada com sucesso! Redirecionando...</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informações Básicas */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-brand-primary" />
            <h2 className="font-semibold text-foreground">Informações básicas</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Categoria */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="categoriaId">
                Categoria *
              </label>
              <select
                id="categoriaId"
                value={formData.categoriaId}
                onChange={(e) => handleChange('categoriaId', e.target.value)}
                className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="">Selecionar categoria...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.nome}</option>
                ))}
              </select>
              {errors.categoriaId && <p className="mt-1 text-xs text-destructive">{errors.categoriaId}</p>}
            </div>

            {/* Cliente */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="clienteId">
                Cliente (opcional)
              </label>
              <select
                id="clienteId"
                value={formData.clienteId}
                onChange={(e) => handleChange('clienteId', e.target.value)}
                className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="">Sem vínculo com cliente</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nomeFantasia || c.razaoSocial || c.nomeCompleto}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1" htmlFor="descricao">
              Descrição *
            </label>
            <input
              id="descricao"
              type="text"
              value={formData.descricao}
              onChange={(e) => handleChange('descricao', e.target.value)}
              placeholder="Descrição da receita..."
              maxLength={255}
              className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
            {errors.descricao && <p className="mt-1 text-xs text-destructive">{errors.descricao}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tipo */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="tipo">
                Tipo
              </label>
              <select
                id="tipo"
                value={formData.tipo}
                onChange={(e) => handleChange('tipo', e.target.value)}
                className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="status">
                Status
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                <option value="PENDENTE">Pendente</option>
                <option value="RECEBIDA">Recebida</option>
              </select>
            </div>

            {/* Forma de Pagamento */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="formaPagamento">
                Forma de recebimento
              </label>
              <select
                id="formaPagamento"
                value={formData.formaPagamento}
                onChange={(e) => handleChange('formaPagamento', e.target.value)}
                className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary"
              >
                {FORMAS_PAGAMENTO.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Valores e Datas */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-5 w-5 text-brand-primary" />
            <h2 className="font-semibold text-foreground">Valores e datas</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Valor */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="valor">
                Valor (USD) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <input
                  id="valor"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formData.valor}
                  onChange={(e) => handleChange('valor', e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-2xl border border-border bg-background pl-7 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              {errors.valor && <p className="mt-1 text-xs text-destructive">{errors.valor}</p>}
            </div>

            {/* Data de Emissão */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="dataEmissao">
                Data de emissão *
              </label>
              <input
                id="dataEmissao"
                type="date"
                value={formData.dataEmissao}
                onChange={(e) => handleChange('dataEmissao', e.target.value)}
                className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
              {errors.dataEmissao && <p className="mt-1 text-xs text-destructive">{errors.dataEmissao}</p>}
            </div>

            {/* Data de Vencimento */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1" htmlFor="dataVencimento">
                Data de vencimento *
              </label>
              <input
                id="dataVencimento"
                type="date"
                value={formData.dataVencimento}
                min={formData.dataEmissao}
                onChange={(e) => handleChange('dataVencimento', e.target.value)}
                className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
              {errors.dataVencimento && <p className="mt-1 text-xs text-destructive">{errors.dataVencimento}</p>}
            </div>
          </div>
        </div>

        {/* Recorrência */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="h-5 w-5 text-brand-primary" />
            <h2 className="font-semibold text-foreground">Recorrência</h2>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.recorrente}
              onChange={(e) => handleChange('recorrente', e.target.checked)}
              className="h-4 w-4 rounded border-border"
              aria-label="Receita recorrente"
            />
            <span className="text-sm text-foreground">Esta receita é recorrente</span>
          </label>

          {formData.recorrente && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 rounded-2xl bg-muted/30">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1" htmlFor="frequencia">
                  Frequência
                </label>
                <select
                  id="frequencia"
                  value={formData.recorrencia.frequencia}
                  onChange={(e) => handleRecorrenciaChange('frequencia', e.target.value)}
                  className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  {FREQUENCIAS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1" htmlFor="diaVencimento">
                  Dia de vencimento (1-31)
                </label>
                <input
                  id="diaVencimento"
                  type="number"
                  min="1"
                  max="31"
                  value={formData.recorrencia.diaVencimento}
                  onChange={(e) => handleRecorrenciaChange('diaVencimento', e.target.value)}
                  className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1" htmlFor="dataInicio">
                  Data de início
                </label>
                <input
                  id="dataInicio"
                  type="date"
                  value={formData.recorrencia.dataInicio}
                  onChange={(e) => handleRecorrenciaChange('dataInicio', e.target.value)}
                  className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1" htmlFor="dataFim">
                  Data de fim (opcional)
                </label>
                <input
                  id="dataFim"
                  type="date"
                  value={formData.recorrencia.dataFim}
                  onChange={(e) => handleRecorrenciaChange('dataFim', e.target.value)}
                  className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary"
                />
              </div>
            </div>
          )}
        </div>

        {/* Observações */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <User className="h-5 w-5 text-brand-primary" />
            <h2 className="font-semibold text-foreground">Observações</h2>
          </div>
          <textarea
            id="observacoes"
            value={formData.observacoes}
            onChange={(e) => handleChange('observacoes', e.target.value)}
            placeholder="Observações adicionais (opcional)..."
            rows={3}
            aria-label="Observações"
            className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
          />
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
            {loading ? 'Salvando...' : 'Salvar receita'}
          </button>
        </div>
      </form>
    </div>
  )
}
