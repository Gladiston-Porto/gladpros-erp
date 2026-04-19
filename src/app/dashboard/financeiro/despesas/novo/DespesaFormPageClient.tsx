/**
 * P├ígina: Formul├írio de Despesa
 * 
 * Features:
 * - Criar/editar despesa
 * - Workflow de aprova├º├úo
 * - Valida├º├úo de formul├írio
 * - Upload de anexos
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Save, 
  AlertCircle,
  Upload,
  X,
  CheckCircle,
  DollarSign,
  Calendar,
  FileText,
  User,
  Building2
} from 'lucide-react';

interface Category {
  id: number;
  nome: string;
  cor: string;
  icone: string;
}

interface FormData {
  empresaId: number;
  categoriaId: string;
  fornecedorId: string;
  descricao: string;
  valor: string;
  tipo: string;
  formaPagamento: string;
  dataEmissao: string;
  dataVencimento: string;
  requerAprovacao: boolean;
  aprovadorId: string;
  tipoAprovador: string;
  justificativa: string;
  anexoUrl: string;
  numeroDocumento: string;
  observacoes: string;
}

export default function DespesaFormPageClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const [formData, setFormData] = useState<FormData>({
    empresaId: 1,
    categoriaId: '',
    fornecedorId: '',
    descricao: '',
    valor: '',
    tipo: 'OPERACIONAL',
    formaPagamento: 'TRANSFERENCIA',
    dataEmissao: new Date().toISOString().split('T')[0],
    dataVencimento: '',
    requerAprovacao: false,
    aprovadorId: '',
    tipoAprovador: 'GERENTE',
    justificativa: '',
    anexoUrl: '',
    numeroDocumento: '',
    observacoes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Carregar categorias
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/financeiro/despesas/categorias?empresaId=1&ativo=true');
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (err) {
      console.error('Erro ao carregar categorias:', err);
    }
  };

  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.categoriaId) {
      newErrors.categoriaId = 'Categoria ├⌐ obrigat├│ria';
    }
    if (!formData.descricao || formData.descricao.length < 3) {
      newErrors.descricao = 'Descri├º├úo deve ter no m├¡nimo 3 caracteres';
    }
    if (!formData.valor || parseFloat(formData.valor) <= 0) {
      newErrors.valor = 'Valor deve ser positivo';
    }
    if (!formData.dataEmissao) {
      newErrors.dataEmissao = 'Data de emiss├úo ├⌐ obrigat├│ria';
    }
    if (!formData.dataVencimento) {
      newErrors.dataVencimento = 'Data de vencimento ├⌐ obrigat├│ria';
    }
    if (formData.dataVencimento && formData.dataEmissao) {
      const emissao = new Date(formData.dataEmissao);
      const vencimento = new Date(formData.dataVencimento);
      if (vencimento < emissao) {
        newErrors.dataVencimento = 'Data de vencimento deve ser >= data de emiss├úo';
      }
    }
    if (formData.requerAprovacao && !formData.aprovadorId) {
      newErrors.aprovadorId = 'Aprovador ├⌐ obrigat├│rio quando requer aprova├º├úo';
    }
    if (formData.requerAprovacao && (!formData.justificativa || formData.justificativa.length < 10)) {
      newErrors.justificativa = 'Justificativa deve ter no m├¡nimo 10 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      setError('Por favor, corrija os erros no formul├írio');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload: any = {
        empresaId: formData.empresaId,
        categoriaId: parseInt(formData.categoriaId),
        fornecedorId: formData.fornecedorId ? parseInt(formData.fornecedorId) : null,
        descricao: formData.descricao,
        valor: parseFloat(formData.valor),
        tipo: formData.tipo,
        formaPagamento: formData.formaPagamento,
        dataEmissao: formData.dataEmissao,
        dataVencimento: formData.dataVencimento,
        requerAprovacao: formData.requerAprovacao,
        anexoUrl: formData.anexoUrl || null,
        numeroDocumento: formData.numeroDocumento || null,
        observacoes: formData.observacoes || null
      };

      if (formData.requerAprovacao) {
        payload.aprovacao = {
          aprovadorId: parseInt(formData.aprovadorId),
          tipoAprovador: formData.tipoAprovador,
          nivelAprovacao: 1,
          requerProximoNivel: false,
          justificativa: formData.justificativa
        };
      }

      const response = await fetch('/api/financeiro/despesas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/dashboard/financeiro/despesas');
        }, 2000);
      } else {
        setError(data.error || 'Erro ao criar despesa');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar
          </button>
          <h1 className="text-3xl font-bold text-foreground">Nova Despesa</h1>
          <p className="text-muted-foreground mt-1">Registre uma nova despesa no sistema</p>
        </div>

        {/* Alertas */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-900">Erro</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-green-900">Sucesso!</p>
              <p className="text-green-700 text-sm">Despesa criada com sucesso. Redirecionando...</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informa├º├╡es B├ísicas */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-destructive" />
              <h2 className="text-lg font-semibold text-foreground">Informa├º├╡es B├ísicas</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Categoria */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Categoria <span className="text-destructive">*</span>
                </label>
                <select
                  title="Categoria da despesa"
                  value={formData.categoriaId}
                  onChange={(e) => handleChange('categoriaId', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-destructive/50 focus:border-transparent ${
                    errors.categoriaId ? 'border-red-500' : 'border-border'
                  }`}
                >
                  <option value="">Selecione uma categoria</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nome}</option>
                  ))}
                </select>
                {errors.categoriaId && (
                  <p className="mt-1 text-sm text-destructive">{errors.categoriaId}</p>
                )}
              </div>

              {/* Descri├º├úo */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Descri├º├úo <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={formData.descricao}
                  onChange={(e) => handleChange('descricao', e.target.value)}
                  placeholder="Ex: Sal├írio do m├¬s de outubro"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-destructive/50 focus:border-transparent ${
                    errors.descricao ? 'border-red-500' : 'border-border'
                  }`}
                />
                {errors.descricao && (
                  <p className="mt-1 text-sm text-destructive">{errors.descricao}</p>
                )}
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Tipo <span className="text-destructive">*</span>
                </label>
                <select
                  title="Tipo da despesa"
                  value={formData.tipo}
                  onChange={(e) => handleChange('tipo', e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-destructive/50 focus:border-transparent"
                >
                  <option value="OPERACIONAL">Operacional</option>
                  <option value="ADMINISTRATIVA">Administrativa</option>
                  <option value="PESSOAL">Pessoal</option>
                  <option value="MARKETING">Marketing</option>
                  <option value="TECNOLOGIA">Tecnologia</option>
                  <option value="IMPOSTOS">Impostos</option>
                  <option value="ALUGUEL">Aluguel</option>
                  <option value="SERVICOS">Servi├ºos</option>
                  <option value="FORNECEDORES">Fornecedores</option>
                  <option value="OUTROS">Outros</option>
                </select>
              </div>

              {/* Valor */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Valor ($) <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.valor}
                    onChange={(e) => handleChange('valor', e.target.value)}
                    placeholder="0,00"
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-destructive/50 focus:border-transparent ${
                      errors.valor ? 'border-red-500' : 'border-border'
                    }`}
                  />
                </div>
                {errors.valor && (
                  <p className="mt-1 text-sm text-destructive">{errors.valor}</p>
                )}
              </div>

              {/* Forma de Pagamento */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Forma de Pagamento <span className="text-destructive">*</span>
                </label>
                <select
                  title="Forma de pagamento da despesa"
                  value={formData.formaPagamento}
                  onChange={(e) => handleChange('formaPagamento', e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-destructive/50 focus:border-transparent"
                >
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="PIX">PIX</option>
                  <option value="TRANSFERENCIA">Transfer├¬ncia</option>
                  <option value="BOLETO">Boleto</option>
                  <option value="CARTAO_CREDITO">Cart├úo de Cr├⌐dito</option>
                  <option value="CARTAO_DEBITO">Cart├úo de D├⌐bito</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              {/* Data Emiss├úo */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Data de Emiss├úo <span className="text-destructive">*</span>
                </label>
                <input
                  title="Data de emissão da despesa"
                  type="date"
                  value={formData.dataEmissao}
                  onChange={(e) => handleChange('dataEmissao', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-destructive/50 focus:border-transparent ${
                    errors.dataEmissao ? 'border-red-500' : 'border-border'
                  }`}
                />
                {errors.dataEmissao && (
                  <p className="mt-1 text-sm text-destructive">{errors.dataEmissao}</p>
                )}
              </div>

              {/* Data Vencimento */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Data de Vencimento <span className="text-destructive">*</span>
                </label>
                <input
                  title="Data de vencimento da despesa"
                  type="date"
                  value={formData.dataVencimento}
                  onChange={(e) => handleChange('dataVencimento', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-destructive/50 focus:border-transparent ${
                    errors.dataVencimento ? 'border-red-500' : 'border-border'
                  }`}
                />
                {errors.dataVencimento && (
                  <p className="mt-1 text-sm text-destructive">{errors.dataVencimento}</p>
                )}
              </div>

              {/* N├║mero do Documento */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  N├║mero do Documento
                </label>
                <input
                  type="text"
                  value={formData.numeroDocumento}
                  onChange={(e) => handleChange('numeroDocumento', e.target.value)}
                  placeholder="Ex: NF-12345"
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-destructive/50 focus:border-transparent"
                />
              </div>

              {/* Observa├º├╡es */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Observa├º├╡es
                </label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => handleChange('observacoes', e.target.value)}
                  rows={3}
                  placeholder="Observa├º├╡es adicionais sobre a despesa..."
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-destructive/50 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Aprova├º├úo */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-destructive" />
              <h2 className="text-lg font-semibold text-foreground">Aprova├º├úo</h2>
            </div>

            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.requerAprovacao}
                  onChange={(e) => handleChange('requerAprovacao', e.target.checked)}
                  className="w-4 h-4 text-destructive border-border rounded focus:ring-destructive/50"
                />
                <span className="text-sm font-medium text-foreground">
                  Esta despesa requer aprova├º├úo
                </span>
              </label>
            </div>

            {formData.requerAprovacao && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
                {/* Tipo de Aprovador */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Tipo de Aprovador <span className="text-destructive">*</span>
                  </label>
                  <select
                    title="Tipo de aprovador da despesa"
                    value={formData.tipoAprovador}
                    onChange={(e) => handleChange('tipoAprovador', e.target.value)}
                    className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-destructive/50 focus:border-transparent"
                  >
                    <option value="GERENTE">Gerente</option>
                    <option value="DIRETOR">Diretor</option>
                    <option value="FINANCEIRO">Financeiro</option>
                    <option value="ADMINISTRADOR">Administrador</option>
                  </select>
                </div>

                {/* Aprovador ID (simulado - em produ├º├úo seria um select de usu├írios) */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    ID do Aprovador <span className="text-destructive">*</span>
                  </label>
                  <input
                    title="Identificador do aprovador"
                    type="number"
                    value={formData.aprovadorId}
                    onChange={(e) => handleChange('aprovadorId', e.target.value)}
                    placeholder="ID do usu├írio aprovador"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-destructive/50 focus:border-transparent ${
                      errors.aprovadorId ? 'border-red-500' : 'border-border'
                    }`}
                  />
                  {errors.aprovadorId && (
                    <p className="mt-1 text-sm text-destructive">{errors.aprovadorId}</p>
                  )}
                </div>

                {/* Justificativa */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Justificativa <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    value={formData.justificativa}
                    onChange={(e) => handleChange('justificativa', e.target.value)}
                    rows={3}
                    placeholder="Por que esta despesa necessita aprova├º├úo?"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-destructive/50 focus:border-transparent ${
                      errors.justificativa ? 'border-red-500' : 'border-border'
                    }`}
                  />
                  {errors.justificativa && (
                    <p className="mt-1 text-sm text-destructive">{errors.justificativa}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bot├╡es */}
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="flex items-center gap-2 px-6 py-2 bg-destructive text-white rounded-lg hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Criar Despesa
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
