// app/financeiro/receitas/novo/page.tsx
// Formulário para criar nova receita

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, DollarSign, Calendar, RefreshCw } from 'lucide-react';

interface Category {
  id: number;
  nome: string;
  cor: string;
  icone: string;
}

interface FormData {
  empresaId: number;
  categoriaId: string;
  clienteId: string;
  descricao: string;
  valor: string;
  dataEmissao: string;
  dataVencimento: string;
  tipo: string;
  formaPagamento: string;
  status: string;
  observacoes: string;
  recorrente: boolean;
  recorrencia?: {
    frequencia: string;
    diaVencimento: string;
    dataInicio: string;
    dataFim: string;
  };
}

export default function NovaReceitaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState<FormData>({
    empresaId: 1, // Mock - em produção viria do contexto
    categoriaId: '',
    clienteId: '',
    descricao: '',
    valor: '',
    dataEmissao: new Date().toISOString().split('T')[0],
    dataVencimento: new Date().toISOString().split('T')[0],
    tipo: 'SERVICO',
    formaPagamento: 'PIX',
    status: 'PENDENTE',
    observacoes: '',
    recorrente: false,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/financeiro/receitas/categorias?empresaId=1');
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Preparar payload
      const payload: any = {
        empresaId: formData.empresaId,
        categoriaId: parseInt(formData.categoriaId),
        ...(formData.clienteId && { clienteId: parseInt(formData.clienteId) }),
        descricao: formData.descricao,
        valor: parseFloat(formData.valor),
        dataEmissao: new Date(formData.dataEmissao).toISOString(),
        dataVencimento: new Date(formData.dataVencimento).toISOString(),
        tipo: formData.tipo,
        formaPagamento: formData.formaPagamento,
        status: formData.status,
        observacoes: formData.observacoes || undefined,
        recorrente: formData.recorrente,
      };

      // Se recorrente, adicionar configuração
      if (formData.recorrente && formData.recorrencia) {
        payload.recorrencia = {
          frequencia: formData.recorrencia.frequencia,
          diaVencimento: parseInt(formData.recorrencia.diaVencimento),
          dataInicio: new Date(formData.recorrencia.dataInicio).toISOString(),
          ...(formData.recorrencia.dataFim && {
            dataFim: new Date(formData.recorrencia.dataFim).toISOString()
          }),
        };
      }

      const response = await fetch('/api/financeiro/receitas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message);
        router.push('/financeiro/receitas');
      } else {
        alert(data.error || 'Erro ao criar receita');
      }
    } catch (error) {
      console.error('Erro ao criar receita:', error);
      alert('Erro ao criar receita');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleRecorrenciaChange = (field: string, value: any) => {
    setFormData({
      ...formData,
      recorrencia: {
        ...formData.recorrencia,
        frequencia: formData.recorrencia?.frequencia || 'MENSAL',
        diaVencimento: formData.recorrencia?.diaVencimento || '1',
        dataInicio: formData.recorrencia?.dataInicio || formData.dataVencimento,
        dataFim: formData.recorrencia?.dataFim || '',
        [field]: value,
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <button
            onClick={() => router.back()}
            aria-label="Voltar"
            className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Nova Receita</h1>
            <p className="text-gray-600 mt-1">Preencha os dados para criar uma nova receita</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
          <div className="p-6 space-y-6">
            {/* Informações Básicas */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Informações Básicas
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.descricao}
                    onChange={(e) => handleChange('descricao', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Pagamento de consultoria - Projeto XYZ"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoria <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    aria-label="Categoria"
                    value={formData.categoriaId}
                    onChange={(e) => handleChange('categoriaId', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor (R$) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.valor}
                    onChange={(e) => handleChange('valor', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0,00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    aria-label="Tipo"
                    value={formData.tipo}
                    onChange={(e) => handleChange('tipo', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="SERVICO">Serviço</option>
                    <option value="VENDA_PRODUTO">Venda de Produto</option>
                    <option value="CONSULTORIA">Consultoria</option>
                    <option value="MENSALIDADE">Mensalidade</option>
                    <option value="COMISSAO">Comissão</option>
                    <option value="OUTROS">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Forma de Pagamento <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    aria-label="Forma de Pagamento"
                    value={formData.formaPagamento}
                    onChange={(e) => handleChange('formaPagamento', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PIX">PIX</option>
                    <option value="TRANSFERENCIA">Transferência Bancária</option>
                    <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                    <option value="CARTAO_DEBITO">Cartão de Débito</option>
                    <option value="BOLETO">Boleto</option>
                    <option value="DINHEIRO">Dinheiro</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Datas */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Datas
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Emissão <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    aria-label="Data de Emissão"
                    value={formData.dataEmissao}
                    onChange={(e) => handleChange('dataEmissao', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Vencimento <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    aria-label="Data de Vencimento"
                    value={formData.dataVencimento}
                    onChange={(e) => handleChange('dataVencimento', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    aria-label="Status"
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PENDENTE">Pendente</option>
                    <option value="RECEBIDA">Recebida</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Recorrência */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Recorrência
                </h2>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.recorrente}
                    onChange={(e) => handleChange('recorrente', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Receita recorrente</span>
                </label>
              </div>

              {formData.recorrente && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Frequência <span className="text-red-500">*</span>
                      </label>
                      <select
                        required={formData.recorrente}
                        aria-label="Frequência de Recorrência"
                        value={formData.recorrencia?.frequencia || 'MENSAL'}
                        onChange={(e) => handleRecorrenciaChange('frequencia', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="SEMANAL">Semanal</option>
                        <option value="QUINZENAL">Quinzenal</option>
                        <option value="MENSAL">Mensal</option>
                        <option value="BIMESTRAL">Bimestral</option>
                        <option value="TRIMESTRAL">Trimestral</option>
                        <option value="SEMESTRAL">Semestral</option>
                        <option value="ANUAL">Anual</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Dia do Vencimento <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        required={formData.recorrente}
                        aria-label="Dia do Vencimento"
                        placeholder="1"
                        value={formData.recorrencia?.diaVencimento || '1'}
                        onChange={(e) => handleRecorrenciaChange('diaVencimento', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data de Início <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required={formData.recorrente}
                        aria-label="Data de Início da Recorrência"
                        value={formData.recorrencia?.dataInicio || formData.dataVencimento}
                        onChange={(e) => handleRecorrenciaChange('dataInicio', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data de Fim (opcional)
                      </label>
                      <input
                        type="date"
                        aria-label="Data de Fim da Recorrência"
                        value={formData.recorrencia?.dataFim || ''}
                        onChange={(e) => handleRecorrenciaChange('dataFim', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Observações */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observações
              </label>
              <textarea
                rows={4}
                value={formData.observacoes}
                onChange={(e) => handleChange('observacoes', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Informações adicionais sobre esta receita..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 rounded-b-lg">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              <Save className="w-5 h-5 mr-2" />
              {loading ? 'Salvando...' : 'Salvar Receita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
