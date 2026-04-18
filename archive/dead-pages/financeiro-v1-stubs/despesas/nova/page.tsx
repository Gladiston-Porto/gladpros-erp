// app/financeiro/despesas/nova/page.tsx
// Formulário para criar nova despesa

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, DollarSign, Calendar, RefreshCw } from 'lucide-react';
import { 
  PageHeader, 
  Card, 
  CardContent, 
  Button, 
  Input
} from '@gladpros/ui';

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

const FormLabel = ({ children, htmlFor, required, className = '' }: { children: React.ReactNode, htmlFor?: string, required?: boolean, className?: string }) => (
  <label htmlFor={htmlFor} className={`block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 ${className}`}>
    {children} {required && <span className="text-red-500">*</span>}
  </label>
);

export default function NovaDespesaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState<FormData>({
    empresaId: 1, // Mock
    categoriaId: '',
    fornecedorId: '',
    descricao: '',
    valor: '',
    dataEmissao: new Date().toISOString().split('T')[0],
    dataVencimento: new Date().toISOString().split('T')[0],
    tipo: 'DESPESA_OPERACIONAL',
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
      // TODO: Implementar API real
      // const response = await fetch('/api/financeiro/despesas/categorias?empresaId=1');
      // const data = await response.json();
      
      // Mock categories
      const mockCategories = [
        { id: 1, nome: 'Aluguel', cor: 'red', icone: 'home' },
        { id: 2, nome: 'Energia', cor: 'yellow', icone: 'zap' },
        { id: 3, nome: 'Internet', cor: 'blue', icone: 'wifi' },
        { id: 4, nome: 'Fornecedores', cor: 'orange', icone: 'truck' },
        { id: 5, nome: 'Pessoal', cor: 'green', icone: 'users' },
      ];
      setCategories(mockCategories);
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
        ...(formData.fornecedorId && { fornecedorId: parseInt(formData.fornecedorId) }),
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

      // TODO: Implementar API real
      // const response = await fetch('/api/financeiro/despesas', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(payload),
      // });
      
      // Mock success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      router.push('/financeiro/despesas');
    } catch (error) {
      console.error('Erro ao criar despesa:', error);
      alert('Erro ao criar despesa');
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

  const inputClass = "flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300";

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Nova Despesa" 
        description="Preencha os dados para registrar uma nova despesa"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Financeiro', href: '/financeiro' },
          { label: 'Despesas', href: '/financeiro/despesas' },
          { label: 'Nova' }
        ]}
      />

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6">
          {/* Informações Básicas */}
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-white/5">
                <DollarSign className="w-5 h-5 text-red-600" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Informações Básicas
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <FormLabel htmlFor="descricao" required>Descrição</FormLabel>
                  <Input
                    id="descricao"
                    required
                    value={formData.descricao}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('descricao', e.target.value)}
                    placeholder="Ex: Conta de Luz - Novembro"
                  />
                </div>

                <div>
                  <FormLabel htmlFor="categoria" required>Categoria</FormLabel>
                  <select
                    id="categoria"
                    aria-label="Categoria"
                    required
                    value={formData.categoriaId}
                    onChange={(e) => handleChange('categoriaId', e.target.value)}
                    className={inputClass}
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
                  <FormLabel htmlFor="valor" required>Valor (R$)</FormLabel>
                  <Input
                    id="valor"
                    type="number"
                    step="0.01"
                    required
                    value={formData.valor}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('valor', e.target.value)}
                    placeholder="0,00"
                  />
                </div>

                <div>
                  <FormLabel htmlFor="tipo" required>Tipo</FormLabel>
                  <select
                    id="tipo"
                    aria-label="Tipo"
                    required
                    value={formData.tipo}
                    onChange={(e) => handleChange('tipo', e.target.value)}
                    className={inputClass}
                  >
                    <option value="DESPESA_OPERACIONAL">Despesa Operacional</option>
                    <option value="CUSTO_PRODUTO">Custo de Produto</option>
                    <option value="IMPOSTO">Imposto</option>
                    <option value="FOLHA_PAGAMENTO">Folha de Pagamento</option>
                    <option value="OUTROS">Outros</option>
                  </select>
                </div>

                <div>
                  <FormLabel htmlFor="formaPagamento" required>Forma de Pagamento</FormLabel>
                  <select
                    id="formaPagamento"
                    aria-label="Forma de Pagamento"
                    required
                    value={formData.formaPagamento}
                    onChange={(e) => handleChange('formaPagamento', e.target.value)}
                    className={inputClass}
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
            </CardContent>
          </Card>

          {/* Datas */}
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-white/5">
                <Calendar className="w-5 h-5 text-red-600" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Datas e Status
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <FormLabel htmlFor="dataEmissao" required>Data de Emissão</FormLabel>
                  <Input
                    id="dataEmissao"
                    type="date"
                    required
                    value={formData.dataEmissao}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('dataEmissao', e.target.value)}
                  />
                </div>

                <div>
                  <FormLabel htmlFor="dataVencimento" required>Data de Vencimento</FormLabel>
                  <Input
                    id="dataVencimento"
                    type="date"
                    required
                    value={formData.dataVencimento}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('dataVencimento', e.target.value)}
                  />
                </div>

                <div>
                  <FormLabel htmlFor="status">Status</FormLabel>
                  <select
                    id="status"
                    aria-label="Status"
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className={inputClass}
                  >
                    <option value="PENDENTE">Pendente</option>
                    <option value="PAGA">Paga</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recorrência */}
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-red-600" />
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Recorrência
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="recorrente"
                    aria-label="Despesa recorrente"
                    checked={formData.recorrente}
                    onChange={(e) => handleChange('recorrente', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-600"
                  />
                  <FormLabel htmlFor="recorrente" className="cursor-pointer mb-0">Despesa recorrente</FormLabel>
                </div>
              </div>

              {formData.recorrente && (
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800 rounded-xl p-6 animate-in fade-in slide-in-from-top-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <FormLabel htmlFor="frequencia" required>Frequência</FormLabel>
                      <select
                        id="frequencia"
                        aria-label="Frequência"
                        required={formData.recorrente}
                        value={formData.recorrencia?.frequencia || 'MENSAL'}
                        onChange={(e) => handleRecorrenciaChange('frequencia', e.target.value)}
                        className={inputClass}
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
                      <FormLabel htmlFor="diaVencimento" required>Dia do Vencimento</FormLabel>
                      <Input
                        id="diaVencimento"
                        type="number"
                        min="1"
                        max="31"
                        required={formData.recorrente}
                        value={formData.recorrencia?.diaVencimento || '1'}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleRecorrenciaChange('diaVencimento', e.target.value)}
                      />
                    </div>

                    <div>
                      <FormLabel htmlFor="dataInicio" required>Data de Início</FormLabel>
                      <Input
                        id="dataInicio"
                        type="date"
                        required={formData.recorrente}
                        value={formData.recorrencia?.dataInicio || formData.dataVencimento}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleRecorrenciaChange('dataInicio', e.target.value)}
                      />
                    </div>

                    <div>
                      <FormLabel htmlFor="dataFim">Data de Fim (opcional)</FormLabel>
                      <Input
                        id="dataFim"
                        type="date"
                        value={formData.recorrencia?.dataFim || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleRecorrenciaChange('dataFim', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Observações */}
          <Card>
            <CardContent className="p-6">
              <FormLabel htmlFor="observacoes">Observações</FormLabel>
              <textarea
                id="observacoes"
                aria-label="Observações"
                rows={4}
                value={formData.observacoes}
                onChange={(e) => handleChange('observacoes', e.target.value)}
                placeholder="Informações adicionais sobre esta despesa..."
                className={`${inputClass} h-auto`}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              variant="primary"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Salvando...' : 'Salvar Despesa'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
